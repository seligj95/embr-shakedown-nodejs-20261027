import json
import os
import re
import selectors
import subprocess
import unittest
from contextlib import contextmanager
from http.client import HTTPConnection
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get("PHP_BIN", "php")


@contextmanager
def development_server(greeting=None):
    environment = os.environ.copy()
    environment.pop("GREETING", None)
    if greeting is not None:
        environment["GREETING"] = greeting
    environment.pop("PHP_CLI_SERVER_WORKERS", None)
    environment["UNRELATED_SAMPLE_SETTING"] = "not-part-of-the-response"
    process = subprocess.Popen(
        [PHP, "-S", "127.0.0.1:0", "-t", str(ROOT)],
        cwd=ROOT,
        env=environment,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(process.stderr, selectors.EVENT_READ)
            if not selector.select(timeout=5):
                raise RuntimeError("PHP development server did not announce startup")
            startup = process.stderr.readline()
        address = re.search(r"http://127\.0\.0\.1:(\d+)\) started", startup)
        if address is None or process.poll() is not None:
            raise RuntimeError(f"PHP development server failed to start: {startup}")
        yield process, int(address.group(1))
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
            raise RuntimeError("PHP development server did not stop after termination")
        finally:
            process.stderr.close()


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.version = subprocess.check_output(
            [PHP, "-r", "echo PHP_VERSION;"], text=True
        )
        if not cls.version.startswith("8.5."):
            raise RuntimeError(f"PHP 8.5.x is required; found {cls.version}")

    def assert_response(self, server, path, status, body, method="GET"):
        process, port = server
        self.assertIsNone(process.poll(), "Owned PHP server stopped unexpectedly")
        connection = HTTPConnection("127.0.0.1", port, timeout=5)
        try:
            connection.request(method, path)
            response = connection.getresponse()
            content = response.read()
            self.assertEqual(response.status, status)
            self.assertEqual(content, body.encode("utf-8"))
            self.assertEqual(
                response.getheader("Content-Type"), "text/plain; charset=utf-8"
            )
        finally:
            connection.close()
        self.assertIsNone(process.poll(), "Owned PHP server stopped unexpectedly")

    def greeting(self, value="Hello"):
        return f"App Service Builder / php-web: {value} (PHP {self.version})\n"

    def test_unset_greeting(self):
        with development_server() as server:
            self.assert_response(server, "/", 200, self.greeting())

    def test_direct_index(self):
        with development_server() as server:
            self.assert_response(server, "/index.php", 200, self.greeting())

    def test_exact_health_body(self):
        with development_server() as server:
            self.assert_response(server, "/health.php", 200, "healthy\n")

    def test_custom_greeting_does_not_change_health(self):
        with development_server("Welcome") as server:
            self.assert_response(server, "/", 200, self.greeting("Welcome"))
            self.assert_response(server, "/health.php", 200, "healthy\n")

    def test_empty_greeting_uses_default(self):
        with development_server("") as server:
            self.assert_response(server, "/", 200, self.greeting())

    def test_zero_greeting_is_not_empty(self):
        with development_server("0") as server:
            self.assert_response(server, "/", 200, self.greeting("0"))

    def test_whitespace_greeting_is_preserved(self):
        with development_server(" ") as server:
            self.assert_response(server, "/", 200, self.greeting(" "))

    def test_utf8_greeting_is_plain_text(self):
        with development_server("Caf\u00e9 <sample>") as server:
            self.assert_response(
                server, "/", 200, self.greeting("Caf\u00e9 <sample>")
            )

    def test_query_does_not_change_response(self):
        with development_server() as server:
            self.assert_response(server, "/?GREETING=ignored", 200, self.greeting())
            self.assert_response(server, "/health.php?check=1", 200, "healthy\n")

    def test_unknown_path(self):
        with development_server() as server:
            self.assert_response(server, "/not-found", 404, "Not found\n")

    def test_health_head(self):
        with development_server() as server:
            self.assert_response(server, "/health.php", 200, "", method="HEAD")


class SourceContractTests(unittest.TestCase):
    def test_minimal_hosted_manifest(self):
        self.assertEqual(
            (ROOT / "builder.yaml").read_text(),
            'components:\n'
            '  - name: web\n'
            '    role: web\n'
            '    platform: php\n'
            '    platformVersion: "8.5"\n'
            '    run:\n'
            '      healthCheckPath: /health.php\n',
        )

    def test_dependency_free_composer_project(self):
        project = json.loads((ROOT / "composer.json").read_text())
        self.assertEqual(project["require"], {"php": ">=8.5 <8.6"})
        self.assertEqual(project.get("require-dev", {}), {})
        lock = json.loads((ROOT / "composer.lock").read_text())
        self.assertEqual(lock["packages"], [])
        self.assertEqual(lock["packages-dev"], [])

    def test_only_sample_php_endpoints(self):
        endpoints = {
            path.relative_to(ROOT).as_posix()
            for path in ROOT.rglob("*.php")
            if not path.is_relative_to(ROOT / "vendor")
        }
        self.assertEqual(endpoints, {"index.php", "health.php"})


if __name__ == "__main__":
    unittest.main()
