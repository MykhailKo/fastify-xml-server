import { BuilderOptions, ParserOptions } from 'xml2js';
import { FastifyPluginOptions, FastifyRequest } from 'fastify';

export { BuilderOptions, ParserOptions } from 'xml2js';

export interface XmlServerOptions extends FastifyPluginOptions {
  parserOptions?: ParserOptions;
  serializerOptions?: BuilderOptions;
  errorTranslator?: (error: any) => Record<string, any>;
  wrapper?: Record<string, any>;
  contentType?: string[];
  maxXmlTreeDepth?: number;
  assignOneElementArrays?: boolean;
  propagateRawXml?: boolean;
  dropNamespacePrefixes?: boolean;
}

export function fastifyXmlServer(
  server: FastifyInstance,
  options: XmlServerOptions,
  done: (error?: FastifyError) => void
): void;

export interface XmlParserOptions {
  parserOptions?: ParserOptions;
  maxXmlTreeDepth?: number;
  assignOneElementArrays?: boolean;
  dropNamespacePrefixes?: boolean;
}

export interface XmlBuilderOptions {
  serializerOptions?: BuilderOptions;
  wrapper?: Record<string, any>;
}

export async function parseXml<T = Record<string, any>>(xml: string, options?: XmlParserOptions): Promise<T>;
export function buildXml<T = Record<string, any>>(json: T, options?: XmlBuilderOptions): string;

declare module 'fastify' {
  interface FastifyRequest {
    rawXml?: string;
  }
}
