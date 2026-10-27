#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
dotnet publish -c Release -o bin/sample-publish --configfile NuGet.Config

temp_dir=$(mktemp -d)
app_pid=""

stop_app() {
    if [[ -n "$app_pid" ]]; then
        if kill -0 "$app_pid" 2>/dev/null; then
            kill "$app_pid"
        fi
        if wait "$app_pid"; then
            app_pid=""
        else
            local status=$?
            app_pid=""
            printf 'Sample process exited unexpectedly with status %s\n' "$status" >&2
            return 1
        fi
    fi
}

cleanup() {
    local status=$?
    if ! stop_app; then
        status=1
    fi
    rm -f "$temp_dir/app.log" "$temp_dir/body"
    rmdir "$temp_dir"
    return "$status"
}
trap cleanup EXIT

assert_response() {
    local path=$1 expected_status=$2 expected_body=$3 status
    status=$(curl --silent --show-error --max-time 5 \
        --output "$temp_dir/body" --write-out '%{http_code}' "http://127.0.0.1:8080$path")
    if [[ "$status" != "$expected_status" ]] ||
        ! printf '%s' "$expected_body" | cmp -s - "$temp_dir/body"; then
        printf 'Unexpected response for %s: HTTP %s\n' "$path" "$status" >&2
        cat "$temp_dir/body" >&2
        return 1
    fi
    if ! kill -0 "$app_pid" 2>/dev/null; then
        printf 'Sample process exited during HTTP validation\n' >&2
        cat "$temp_dir/app.log" >&2
        return 1
    fi
}

for mode in unset empty custom; do
    if curl --silent --max-time 1 --output /dev/null http://127.0.0.1:8080/; then
        printf 'Port 8080 is already serving HTTP; stop that process before testing.\n' >&2
        exit 1
    fi

    case "$mode" in
        unset) unset SAMPLE_GREETING; expected="Hello" ;;
        empty) export SAMPLE_GREETING=""; expected="Hello" ;;
        custom) export SAMPLE_GREETING="Welcome"; expected="Welcome" ;;
    esac

    env 'Logging__LogLevel__Microsoft.Hosting.Lifetime=Information' \
        dotnet bin/sample-publish/BuilderDotnetSample.dll > "$temp_dir/app.log" 2>&1 &
    app_pid=$!
    ready=false
    for ((attempt = 0; attempt < 100; attempt++)); do
        if ! kill -0 "$app_pid" 2>/dev/null; then
            break
        fi
        if grep -Fq 'Now listening on: http://0.0.0.0:8080' "$temp_dir/app.log"; then
            ready=true
            break
        fi
        sleep 0.1
    done
    if [[ "$ready" != true ]]; then
        printf 'Sample failed to bind port 8080 within 10 seconds (%s greeting).\n' "$mode" >&2
        cat "$temp_dir/app.log" >&2
        exit 1
    fi

    assert_response "/" 200 "App Service Builder / dotnet-web: $expected"$'\n'
    assert_response "/health" 200 $'OK\n'
    assert_response "/not-found" 404 ""
    stop_app
    printf 'Passed root, health, and 404 checks with %s SAMPLE_GREETING\n' "$mode"
done
