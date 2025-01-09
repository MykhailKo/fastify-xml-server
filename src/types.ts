import { FastifyPluginOptions, FastifyRequest } from 'fastify';
import { BuilderOptions, ParserOptions } from 'xml2js';

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