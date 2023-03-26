# build stage install dependencies including devDependencies and build the app.
FROM node:19-slim as build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . ./

RUN npm run build

# Run the web service on container startup
FROM node:19-alpine

WORKDIR /usr/src/app

COPY ./package.json ./package-lock.json ./

RUN npm install --production --no-progress

COPY --from=build /usr/src/app/dist ./dist

# tini enable canceling of processes by ctrl-c when docker run is used
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# use non-root user to avoid permission issues
USER node

# Run the web service on container startup.
CMD ["node", "dist/app.js"]
