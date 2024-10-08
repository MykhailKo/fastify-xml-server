import { FastifyPluginOptions, FastifyRequest } from 'fastify';
import { BuilderOptions, ParserOptions } from 'xml2js';

export interface XmlServerOptions extends FastifyPluginOptions {
  parserOptions?: ParserOptions;
  serializerOptions?: BuilderOptions;
  errorTranslator?: (error: any) => Record<string, any>;
  wrapper?: Record<string, any>;
  contentType?: string[];
  assignOneElementArrays?: boolean;
  propagateRawXml?: boolean;
  dropNamespacePrefixes?: boolean; 
}

export interface XmlParserOptions {
  parserOptions?: ParserOptions;
  wrapper?: Record<string, any>;
  assignOneElementArrays?: boolean;
  dropNamespacePrefixes?: boolean; 
}