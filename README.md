# BOLT TYPESCRIPT BOILERPLATE

## Setup

### Install deno for lint.

```sh
brew install deno # mac os
```

If you cannot use brew, please see the deno official install dox.

[Deno installation](https://deno.land/manual/getting_started/installation)

### Create .env file

```sh
cp .env.example .env
```

Get a slack bot token and slack signing secret and put to .env file.
[Bolt reference](https://slack.dev/bolt-js/tutorial/getting-started)

## How to use the bolt?

You can follow the [tutorial](https://slack.dev/bolt-js/tutorial/getting-started).

## How to deploy to the cloud run

### Build a docker image and deploy to the cloud run

Update IAM to use cloud-build to deploy to the cloud-run.

```sh
#!/bin/bash

PROJECT_ID=
PROJECT_NUMBER=

roles=(run.admin run.serviceAgent iam.serviceAccountUser) 
for role in $roles; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
    --role roles/$role
done
```

Run the deploy command.

```sh
gcloud builds submit --config cloudbuild.yaml \
      --substitutions=_SLACK_BOT_TOKEN="xoxb-....." \
      --substitutions=_SLACK_SIGNING_SECRET="99712..." \
      --substitutions=_ARTIFACT_REGISTRY_REPO="cloud-run-source-deploy" \
      --substitutions=_IMAGE_NAME="bolt-typescript-boilerplate" \
      --substitutions=_SERVICE_NAME="bolt-typescript-boilerplate"
```

## Troubleshooting

## Build and run the application locally with docker

```sh
docker build . -f ./docker/app/Dockerfile --tag bolt-typescript-boilerplate
docker run --env-file .env -p 8080:8080 -t bolt-typescript-boilerplate:latest
```

If you want to pull a docker image from GCR, you need to [update the local docker configuration](https://cloud.google.com/artifact-registry/docs/docker/authentication).

```sh
gcloud auth configure-docker us-west1-docker.pkg.dev
```
