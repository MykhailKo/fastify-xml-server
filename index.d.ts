import { BuilderOptions, ParserOptions } from 'xml2js';
import { FastifyPluginOptions, FastifyRequest } from 'fastify';

export { BuilderOptions, ParserOptions } from 'xml2js';

export interface FastifyRequstWithXml extends FastifyRequest {
  rawXml: string;
}

export interface XmlServerOptions extends FastifyPluginOptions {
  parserOptions?: ParserOptions;
  serializerOptions?: BuilderOptions;
  errorTranslator?: (error: any) => Record<string, any>;
  wrapper?: Record<string, any>;
  contentType?: string[];
  assignOneElementArrays?: boolean;
  propagateRawXml?: boolean;
}

export function fastifyXmlServer(
  server: FastifyInstance,
  options: XmlServerOptions,
  done: (error?: FastifyError) => void
): void;
