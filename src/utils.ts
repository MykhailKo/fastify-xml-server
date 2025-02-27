import rfdc from 'rfdc';
import { Parser, Builder } from 'xml2js';

import { XmlServerOptions, XmlParserOptions, XmlBuilderOptions } from './types'

const clone = rfdc();

export function assignOneElementArrays(parentNode: Record<string, any>, max_tree_depth: number) {
  const assign = (parentNode: Record<string, any>, depth: number) => {
    if (depth > max_tree_depth) throw new Error('Max tree depth exceeded.');
    for (const [key, value] of Object.entries(parentNode)) {
      if (Array.isArray(value)) {
        if (value.length === 1) {
          if (typeof value[0] === 'object') assign(value[0], ++depth);
          parentNode[key] = value[0];
        } else {
          const nextDepth = depth + 1;
          parentNode[key] = value.map((el: any) => {
            if (typeof el === 'object') assign(el, nextDepth);
            return el;
          });
        }
      } else {
        if(typeof value === 'object') assign(value, ++depth);
      }
    }
  };

  assign(parentNode, 0);
}

export function dropNamespacePrefixes(parentNode: Record<string, any>, max_tree_depth: number) {
  const drop = (parentNode: Record<string, any>, depth: number) => {
    if(depth > max_tree_depth) throw new Error('Max tree depth exceeded.')
    for(const [key, value] of Object.entries(parentNode)) {
      if(typeof value === 'object' && !Array.isArray(value)) drop(value, ++depth);
      if(key.includes(':')) {
        parentNode[key.split(':')[1]] = value;
        delete parentNode[key]; 
      }
    }  
  }

  drop(parentNode, 0);
}

export function addXmlWrapper(
  payload: Record<string, any>,
  wrapper: Record<string, any>,
  ignoredXmlKeys: string[]
): Record<string, any> {
  const wrap = (payload: Record<string, any>, wrapper: Record<string, any>): any => {
    const wrapperKey = Object.keys(wrapper).find((key) => !ignoredXmlKeys.includes(key));
    if (!wrapperKey) return Object.assign(wrapper, payload);
    if (typeof wrapper[wrapperKey] === 'object') return wrap(payload, wrapper[wrapperKey]);
    wrapper[wrapperKey] = payload;
  };

  const wrappedPayload = clone(wrapper);
  wrap(payload, wrappedPayload);
  return wrappedPayload;
}

export function errorTranslator(error: any): Record<string, any> {
  const httpStatus = error.statusCode || 500;
  const errorCode = error.code || (httpStatus >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');

  return {
    'env:Fault': {
      'env:Code': {
        'env:Value': errorCode,
      },
      'env:Reason': {
        'env:Text': error.message,
      },
    },
  };
}

export function checkContentTypeSupport(contentType: string, supportedList: string[]): boolean {
  const typeOnly = contentType.split(';')[0];
  if(supportedList.includes(typeOnly)) return true;
  return supportedList.includes(contentType);
}

export const onDemandParser =
  (defaultOptions: XmlServerOptions, parser: Parser) =>
  async <T = Record<string, any>>(xml: string, options?: XmlParserOptions): Promise<T> => {
    const resOptions = { ...defaultOptions, ...options };
    const resParser = options?.parserOptions ? new Parser(options.parserOptions) : parser;

    const json = await resParser.parseStringPromise(xml);
    if (resOptions.assignOneElementArrays) assignOneElementArrays(json, resOptions.maxXmlTreeDepth as number);
    if (resOptions.dropNamespacePrefixes) dropNamespacePrefixes(json, resOptions.maxXmlTreeDepth as number);
    return json as T;
  };

export const onDemansBuilder = (defaultOptions: XmlServerOptions, ignoredXmlKeys: string[], builder: Builder) => 
  <T = Record<string, any>>(json: T, options?: XmlBuilderOptions): string => {
    const resOptions = {...defaultOptions, ...options};
    const resBuilder = options?.serializerOptions ? new Builder(options.serializerOptions) : builder;

    const wrapped = addXmlWrapper(<Record<string, any>>json, <Record<string, any>>resOptions.wrapper, ignoredXmlKeys); 
    const xml = resBuilder.buildObject(wrapped);
    return xml;
  };