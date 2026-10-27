# App Service Builder: Vite TypeScript sample

A small TypeScript frontend built with Vite and deployed as static files with
[App Service Builder](https://builderapps.azure.com/docs/). The page displays
`App Service Builder / vite-static`, a configurable greeting, and a health-check
link. There is no backend, framework dependency, or hosted Vite development server.

**App Service Builder is in Private Preview for development and testing.** Access
to an enabled subscription and supported preview location is required. This
sample has local build and static HTTP checks; an end-to-end cloud deployment
has not been validated.

## Prerequisites

- Node.js **24.x** and npm. Both `package.json` and `builder.yaml` specify Node 24.
- Git and a GitHub account to fork this repository.
- For deployment: access to App Service Builder Private Preview, an authorized
  Azure subscription, and an existing resource group.

Vite **7.3.6** and TypeScript **5.9.3** are pinned. Keep `package-lock.json` and
use `npm ci` rather than updating dependencies as part of setup.

## Run locally

Fork this repository, then clone your fork:

```sh
git clone https://github.com/<your-github-account>/app-service-builder-vite.git
cd app-service-builder-vite
npm ci --ignore-scripts
npm run build
npm run preview
```

`npm run build` runs `tsc --noEmit` before building `dist/`. The local preview
serves that output at `http://localhost:8080/`. It binds to `0.0.0.0` and fails
if port 8080 is already in use; it does not silently select another port.
Open the page and expect `Hello from Vite.` as the default greeting.

In another terminal:

```sh
curl --fail http://localhost:8080/
curl --fail http://localhost:8080/health
```

Both responses should be HTTP 200; `/health` returns `OK`. Stop the preview with
Ctrl+C. For local development with hot reload, use `npm run dev`; neither that
server nor `npm run preview` is the deployed runtime.

## Build and test

```sh
npm run build
npm test
```

The dependency-free Node.js test starts a loopback-only Vite preview on an
available port, checks the public root, emitted JavaScript assets, and `/health`,
and stops its server. It also checks that the build output contains only static files.
GitHub Actions runs the same build and test commands with Node 24.

## Static deployment contract

`builder.yaml` is at the repository root:

```yaml
components:
  - name: site
    role: static
    platform: nodejs
    platformVersion: "24"
    output: dist
```

For a single component, the repository root is the default source path, so
`path: /` is not required.

Node.js is the **build toolchain**, not a deployed application server. The Vite
build produces `dist/index.html`, bundled JavaScript under `dist/assets/`, and
`dist/health` copied from `public/health`. App Service Builder publishes this
static output at `/`; it must not serve the source directory or `node_modules`.
No parent workspace, custom build command, or runtime override is required.
Do not commit `dist/`, `node_modules/`, or secrets.

## Deploy your fork through the Portal

Follow the [Portal quickstart](https://builderapps.azure.com/docs/quickstarts/portal/)
for the current Private Preview experience.

1. Push the sample to **`main` in your fork**. Local, uncommitted changes are not
   uploaded.
2. In the Portal, create an app in your authorized subscription, existing
   resource group, and supported preview location.
3. Connect GitHub and authorize access to your fork. Select
   `<your-github-account>/app-service-builder-vite`, branch **`main`**, and the
   **repository root** as the source directory. Keep `builder.yaml` there;
   no `samples/vite-static` subdirectory or archive extraction is needed.
4. Explicitly deploy the configured source. Connecting a repository or pushing
   a commit is not a substitute for requesting a deployment.
5. Wait for a successful terminal deployment status, then open the returned
   public app URL. Confirm the page title and greeting, HTTP 200 at `/`, the
   emitted JavaScript loading successfully, and HTTP 200 with `OK` at `/health`.

For later changes, commit and push to your fork's `main`, then explicitly deploy
again and wait for completion before checking the public response.

## Change the public greeting

```sh
VITE_SAMPLE_GREETING="Welcome" npm run build
npm run preview
```

The page now displays `Welcome`. `VITE_*` values used by the app are embedded in
public browser assets: **never put secrets in them**. The greeting is rendered
with `textContent`, not interpreted as HTML. Changing the preview environment
after building does not change the existing static output.

For a deployed app, add `VITE_SAMPLE_GREETING` in Portal **Variables**. **Save
only** stores the desired value without rebuilding the current version.
**Save and deploy** builds a new version with that value. After Save only,
explicitly deploy to apply the change. A retained version keeps its original
assets and greeting. See the
[variables guide](https://builderapps.azure.com/docs/guides/variables/).

## Cleanup

Delete only the sample **app** through the Portal and wait for deletion to
complete. Keep the resource group, subscription, GitHub fork, and unrelated
resources. App deletion does not delete your local clone or repository.

## Documentation and contributions

- [App Service Builder documentation](https://builderapps.azure.com/docs/)
- [Samples](https://builderapps.azure.com/docs/samples/)
- [Manifest guide](https://builderapps.azure.com/docs/guides/builder-yaml/)
- [Runtime requirements](https://builderapps.azure.com/docs/reference/runtimes/)
- [Contributing](CONTRIBUTING.md) and [Microsoft Open Source Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [Changelog](CHANGELOG.md) and [MIT license](LICENSE.md)

For security concerns, follow the
[Microsoft Security Response Center reporting guidance](https://www.microsoft.com/msrc/how-to-report-a-vulnerability);
do not publish sensitive details in a public issue.
