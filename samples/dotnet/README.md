# App Service Builder: ASP.NET HTTP sample

A standalone, minimal ASP.NET app for learning how to deploy committed GitHub
source with [App Service Builder](https://builderapps.azure.com/docs/). The app
targets .NET 10 and has no NuGet package dependencies.

**App Service Builder is in Private Preview. Use this sample for development and
testing, not production.** Local validation does not establish preview runtime
availability or end-to-end deployment readiness. A live preview deployment of
this sample has not been qualified.

## Features

| Endpoint | Response |
| --- | --- |
| `GET /` | HTTP 200, `App Service Builder / dotnet-web: Hello` followed by a newline |
| `GET /health` | HTTP 200, `OK` followed by a newline |
| Unknown path | HTTP 404 |

`SAMPLE_GREETING` changes the deliberately public greeting. The app does not
require credentials or expose environment diagnostics. `builder.yaml` describes
one .NET 10 web component, listening on port 8080 with `/health` as its health
check. The manifest relies on Builder defaults for root routing, port 8080, and
HTTP 200 as the successful health-check status.

## Getting Started

### Prerequisites

- Git and a [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
  on Windows, macOS, or Linux. `global.json` requires SDK `10.0.100` or a later
  stable .NET 10 feature band; preview SDKs are not selected.
- For the optional smoke test: Bash and `curl`, with port 8080 available.
- For deployment: access to the App Service Builder Private Preview, an authorized
  Azure subscription/resource group, and GitHub source access in the Portal.
  Use a location available to your preview subscription; this sample does not
  promise availability in any particular region.

### Installation

Fork [this repository](https://github.com/Azure-Samples/app-service-builder-dotnet)
to your own GitHub account, then clone your fork. Replace `YOUR-GITHUB-USER`:

```sh
git clone https://github.com/YOUR-GITHUB-USER/app-service-builder-dotnet.git
cd app-service-builder-dotnet
dotnet --version
```

The application and `builder.yaml` are already at the repository root; no archive
extraction or monorepo subdirectory selection is needed. Keep `global.json`,
`Directory.Build.props`, and `NuGet.Config` with the project. They isolate SDK
selection, parent MSBuild properties, and public NuGet sources, respectively.
The explicit `--configfile NuGet.Config` below avoids inherited package feeds.

### Quickstart: run locally

From the repository root:

```sh
dotnet publish -c Release -o bin/sample-publish --configfile NuGet.Config
dotnet bin/sample-publish/BuilderDotnetSample.dll
```

In another terminal:

```sh
curl -i http://localhost:8080/
curl -i http://localhost:8080/health
curl -i http://localhost:8080/not-found
```

Expect the responses in the table above. `Program.cs` explicitly binds
`http://0.0.0.0:8080`; changing `PORT` or `ASPNETCORE_URLS` does not change that
binding. Stop the local process with Ctrl+C.

### Local validation

On macOS, Linux, or a Bash environment with the required tools:

```sh
bash scripts/smoke-test.sh
```

The script publishes independently, starts and stops only its own processes, and
checks exact greeting/health bodies, HTTP 404, and unset, empty, and customized
`SAMPLE_GREETING` values. It uses port 8080; stop your earlier local run first.
The GitHub Actions workflow runs the same check on pull requests and changes to
`main`. Generated `bin/` and `obj/` files are not committed.

## Demo

### Deploy your fork through the Portal

Follow the [Portal quickstart](https://builderapps.azure.com/docs/quickstarts/portal/)
for the currently available Private Preview experience.

1. Ensure your fork's `main` branch contains the sample files. Open the App Service
   Builder Portal and create an app in your authorized subscription and resource
   group, using a location available to your preview subscription.
2. Authorize GitHub source access through the Portal. Select **your fork**, its
   **main** branch, and the **repository root** as the source root. Keep
   `builder.yaml` at that root. Do not select the upstream repository if you plan
   to change and deploy your own code.
3. Explicitly start a deployment using the Portal's deploy action. Wait for a
   successful terminal deployment state; source authorization or saving a source
   selection alone does not prove that an app is running.
4. Open the runtime URL shown for your app. Verify `/` returns the greeting and
   `/health` returns HTTP 200 with `OK`. If deployment fails, inspect its logs
   before retrying; do not treat an accepted request as successful deployment.

The manifest selects .NET platform version `"10"` and the standard publish path,
with no custom build command or output override. The start command is
`dotnet BuilderDotnetSample.dll`. Local publish validates that assembly name, not
the build image or live deployment pipeline.

### Change and redeploy

For a code change, edit your fork, commit, and push to the configured `main`
branch. Then explicitly deploy in the Portal, wait for successful completion,
and verify the root and health endpoints again. Pushing source by itself is not
a deployment.

To try a different public greeting locally, stop the app first and run:

```sh
SAMPLE_GREETING="Welcome" dotnet bin/sample-publish/BuilderDotnetSample.dll
```

`GET /` now returns `App Service Builder / dotnet-web: Welcome` followed by a
newline. Unset or empty values use `Hello`. **Never put a secret in
`SAMPLE_GREETING`: its value is returned publicly without authentication.**

For a deployed app, add `SAMPLE_GREETING` in Portal **Variables**. **Save only**
persists desired values but does not change a running version; explicitly deploy
to apply them. **Save and deploy** captures them in a new version. Wait for
completion and verify the greeting. Activating a retained version uses that
version's historical values. See the
[variables guide](https://builderapps.azure.com/docs/guides/variables/).
Do not override the reserved `PORT` variable.

### Cleanup

Stop a local run with Ctrl+C. When finished with the preview, delete **only the
app you created** through the Portal, confirm its identity, and wait for deletion
to complete. Do not delete shared resource groups or unrelated resources. App
deletion does not remove your fork or separate resources.

## Resources

- [App Service Builder documentation](https://builderapps.azure.com/docs/)
- [Portal quickstart](https://builderapps.azure.com/docs/quickstarts/portal/)
- [Samples](https://builderapps.azure.com/docs/samples/)
- [Runtime requirements](https://builderapps.azure.com/docs/reference/runtimes/)
- [Variables guide](https://builderapps.azure.com/docs/guides/variables/)
- [Contributing](CONTRIBUTING.md) and [Microsoft Open Source Code of Conduct](.github/CODE_OF_CONDUCT.md)
- [MIT license](LICENSE.md)

For security concerns, follow the [Microsoft Security Response Center reporting
guidance](https://www.microsoft.com/msrc/faqs-report-an-issue) rather than opening
a public issue containing sensitive information.
