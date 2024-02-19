# fastify-xml-server

Fastify plugin which integrates [xml2js](https://www.npmjs.com/package/xml2js) and modifies your Fastify server to receive XML requests and send XML responses while still working with JSON data internally.

_Contents_:

- [XML Server VS SOAP Server](#xml-server-vs-soap-server)
- [Usage](#usage)
- [Configuration](#configuration)
- [Getting original XML in request object](#getting-original-xml-in-request-object)
- [Under the hood](#under-the-hood)

## XML Server VS SOAP Server

Even though this plugin allows to completely switch the communication data format of a server and handle errors with XML responses (and is definitely useful for majority of use cases where you need SOAP) it is missing one important feature of a complete SOAP server - which is the routing. Unlike REST it is not uncommon for SOAP to have a single URL path responsible for multiple operations and the decision on what operation to perform is made based on the payload of a request. So if you are facing a use case like that you would have to implement this decision logic in a single request handler or maybe find additional libraries for this purpose. Otherwise this plugin should satisfy the vast majorty of SOAP use cases, but this detail does not allow to call it SOAP server.

## Usage

```typescript
import fastify from 'fastify';
import { fastifyXmlServer } from 'fastify-xml-server';

const server = fastify({ logger: true });

server.register(fastifyXmlServer, { contentType: ['application/xml'] });

server.listen({ port: 3000 }, (err, address) => {
  server.log.info(`server listening on ${address}`);
});
```

## Configuration

The plugin is configured with options object of `XmlServerOptions` interface:

```typescript
export interface XmlServerOptions extends FastifyPluginOptions {
  parserOptions?: ParserOptions;
  serializerOptions?: BuilderOptions;
  errorTranslator?: (error: any) => Record<string, any>;
  wrapper?: Record<string, any>;
  contentType?: string[];
  assignOneElementArrays?: boolean;
  propagateRawXml?: boolean;
}
```

- `parserOptions` - config of xml2js parser (responsible for parsing xml requests to json) using xml2js `ParserOptions` interface without changes, this config is passed through directly to xml2js.<br>
  **default**:
  ```typescript
  {
    explicitRoot: false, // removes root wrapper element to avoid unnecessary property chaning in Javascript
    ignoreAttrs: true // removes xml tag attributes from resulting JSON object leaving only tag values
  }
  ```
- `serializerOptions` - config of xml2js builder (responsible for serializing responses to xml string) using xml2js `BuilderOptions` interface without changes, this config is passed through directly to xml2js.<br>
  **default**:
  ```typescript
  {
    renderOpts: {
      pretty: false; // skips additional processing for linebreaks and indentation to improve performance and reduce response size
    }
  }
  ```
- `errorTranslator` - a function responsible for translating errors into input objects for xml serializer. This function replaces standard Fastify error handler and allows to send xml even for some automatic error responses of Fastify.<br>By default `errorTranslator` maps Node.js `Error` into [SOAP 1.2](https://www.w3.org/2003/05/soap-envelope/) `Fault` schema (setting only `Code` and `Reason` tags).
- `wrapper` - Node.js object describing top level xml wrapper tags. The plugin automatically wraps all of your responses into the specified wrapper object before proceeding to serialization to help you avoid creating boilerplate code and complicating response objects in your implementation.<br>
  By default a wrapper object is the standard [SOAP 1.2](https://www.w3.org/2003/05/soap-envelope/) `Envelope` and `Body` tags specified in standard SOAP 1.2 `env` namespace.<br>
  **default**:
  ```typescript
  {
    'env:Envelope': {
      $: {
        'xmlns:env': 'https://www.w3.org/2003/05/soap-envelope/',
      },
      'env:Body': '',
    },
  }
  ```
  > **Note**: wrapper object is serialized using the same xml2js builder therefore you should use xml2js syntax for specifing attributes etc.
- `contentType` - list of supported HTTP content types.<br>
  **default:** `['application/xml', 'text/xml']`
  > **Note**: first element from the list is used to set `Content-Type` header on responses, all values represent supported request content types.
- `assignOneElementArrays` - xml2js parser always outputs all child elements as arrays, even in cases there the child of an element is a string value or there is just one child, this flag allows to improve this output by assigning all arrays with one element and all arrays with element values as values to their parent keys dropping the array syntax (which makes it much more operable, see example)<br>
  **default:** `true`<br>
  **Example**:<br>
  Input xml:
  ```xml
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/>
    <soapenv:Body>
      <soapenv:detail>
        <soapenv:Value>1</soapenv:Value>
      </soapenv:detail>
    </soapenv:Body>
  </soapenv:Envelope>
  ```
  Standard xml2js parser output:
  ```json
  {
    "soapenv:Header": [""],
    "soapenv:Body": [
      {
        "soapenv:detail": [
          {
            "soapenv:Value": ["1"]
          }
        ]
      }
    ]
  }
  ```
  Standard xml2js parser output with `assignOneElementArrays` enabled:
  ```json
  {
    "soapenv:Header": "",
    "soapenv:Body": {
      "soapenv:detail": {
        "soapenv:Value": "1"
      }
    }
  }
  ```
  > **Note**: because `assignOneElementArrays` executes a recursive function on a JSON tree it is limited in depth to 30 to avoid denial of service caused by too deep recusrion.
- `propagateRawXml` - if enabled adds `rawXml` property containing origninal XML string to Fastify request object making it available in a handler function.
  **default**: `false`

## Getting original XML in request object

In order to get access to the original XML request string in your request handler or custom hook functions set `propagateRawXml` property in options object to `true`.<br>
After that is done the plugin will add the original XML into `rawXml` property of a Fastify request object.<br>
With Typescript you might also need to use the exported `XmlPayload` interface and pass it as a type argument to `FastifyRequest` interface in order to avoid linter errors while trying to reference `rawXml` property.

```typescript
import fastify, { FastifyRequest } from 'fastify';
import { fastifyXmlServer, XmlPayload } from 'fastify-xml-server';

const server = fastify({ logger: true });

server.register(fastifyXmlServer, { propagateRawXml: true });

server.route({
  method: 'POST',
  url: '/call',
  handler: async (req: FastifyRequest<XmlPayload>, rep) => {
    console.log(req.rawXml);
    return rep.status(200).send({ ...(req.body as Record<string, any>) });
  },
});

server.listen({ port: 3000 }, (err, address) => {
  server.log.info(`server listening on ${address}`);
});
```

> **Note**: keep in mind that the original XML string might take up a considerable amount of memory.

## Under the hood

If you are familiar with Fastify this section should be interesting and informative for you, but also shuold help to understand what is heppening under the hood of the plugin and potentially contribute improvements or debug problems.

The plugin makes 5 modifications of your Fastify server instance:

1. Sets `onRequest` hook which executes request `Content-Type` check and rejects unsupported media types.
2. Sets custom request parser (using xml2js) for the configured list of xml content types with the `addContentTypeParser` method of a Fastify instance.
3. Sets custom error handler function with the `setErrorHandler` method of a Fastify instance, which uses the specified `errorTranslator` in order to generate object representation of XML error response and serializes it into XML.
4. Sets custom reply serializer with the `setReplySerializer` method of a Fastify instance, which uses xml2js Builder in order to serialize response object.
5. Sets `onSend` hook which adds the specified `Content-Type` header to every response.
