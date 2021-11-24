import {
  ApolloServerPlugin,
  GraphQLSchemaContext,
  GraphQLServerListener,
} from "apollo-server-plugin-base";
import { TelemetryClient } from "applicationinsights";
import { v4 as uuid } from "uuid";

export default function (
  input: string | TelemetryClient,
  logName?: string
): ApolloServerPlugin {
  let client: TelemetryClient;
  if (typeof input === "string") {
    client = new TelemetryClient(input);
  } else {
    client = input;
  }

  return {
    async serverWillStart(service): Promise<GraphQLServerListener> {
      const requestId = uuid();
      client.trackEvent({
        name: "serviceWillStart",
        time: new Date(),
        properties: {
          apolloConfig: service.apollo,
          schema: service.schema,
          requestId,
          logName,
          serverlessFramework: service.serverlessFramework,
        },
      });

      return Promise.resolve({
        async drainServer() {
          client.trackEvent({
            name: "drainServer",
            time: new Date(),
            properties: { requestId, logName },
          });
        },
        schemaDidLoadOrUpdate(schemaContext: GraphQLSchemaContext) {
          client.trackEvent({
            name: "schemaDidLoadOrUpdate",
            properties: {
              schema: schemaContext.apiSchema.toString(),
              requestId,
              logName,
            },
            time: new Date(),
          });
        },
        async serverWillStop() {
          client.trackEvent({
            name: "serverWillStop",
            time: new Date(),
            properties: { requestId, logName },
          });
        },
      });
    },
    requestDidStart(context) {
      const requestId = uuid();
      const headers: { [key: string]: string | null } = {};
      if (context.request.http?.headers) {
        for (const [key, value] of context.request.http.headers) {
          headers[key] = value;
        }
      }
      client.trackEvent({
        name: "requestDidStart",
        time: new Date(),
        properties: {
          requestId,
          metrics: context.metrics,
          request: context.request,
          headers,
          isDebug: context.debug,
          operationName: context.operationName,
          operation: context.operation,
          logName,
        },
      });

      return Promise.resolve({
        didEncounterErrors(requestContext) {
          for (const error in requestContext.errors) {
            client.trackException({
              exception: new Error(error),
              properties: {
                requestId,
                logName,
              },
            });
          }
          return Promise.resolve();
        },
        didResolveOperation(requestContext) {
          client.trackEvent({
            name: "didResolveOperation",
            properties: {
              requestId,
              operationName: requestContext.operationName,
              operation: requestContext.operation,
              logName,
            },
          });
          return Promise.resolve();
        },
        didResolveSource(requestContext) {
          client.trackEvent({
            name: "didResolveSource",
            properties: {
              requestId,
              source: requestContext.source,
              queryHash: requestContext.queryHash,
              metrics: requestContext.metrics,
              logName,
            },
          });
          return Promise.resolve();
        },
        parsingDidStart(requestContext) {
          client.trackEvent({
            name: "parsingDidStart",
            properties: {
              requestId,
              source: requestContext.source,
              queryHash: requestContext.queryHash,
              metrics: requestContext.metrics,
              logName,
            },
          });
          return Promise.resolve();
        },
        validationDidStart(requestContext) {
          client.trackEvent({
            name: "validationDidStart",
            properties: {
              requestId,
              source: requestContext.source,
              queryHash: requestContext.queryHash,
              metrics: requestContext.metrics,
              logName,
            },
          });
          return Promise.resolve();
        },
      });
    },
  };
}