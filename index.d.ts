import { BuilderOptions, ParserOptions } from 'xml2js';
import { FastifyPluginOptions } from 'fastify';
import { ReplyGenericInterface } from 'fastify/types/reply';

export { BuilderOptions, ParserOptions } from 'xml2js';

export interface XmlPayload extends ReplyGenericInterface {
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
