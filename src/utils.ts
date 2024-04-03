import rfdc from 'rfdc';
import { Parser } from 'xml2js';

import { XmlServerOptions } from '..';

const clone = rfdc();

export function assignOneElementArrays(parentNode: Record<string, any>) {
  const MAX_TREE_DEPTH = 30;
  const assign = (parentNode: Record<string, any>, depth: number) => {
    if (depth > MAX_TREE_DEPTH) throw new Error('Max tree depth exceeded.');
    for (const [key, value] of Object.entries(parentNode)) {
      if (Array.isArray(value)) {
        if (value.length === 1) {
          if (typeof value[0] === 'object') assign(value[0], ++depth);
          parentNode[key] = value[0];
        } else {
          parentNode[key] = value.map((el: any) => {
            if (typeof el === 'object') assign(el, ++depth);
            return el;
          });
        }
      }
    }
  };

  assign(parentNode, 0);
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

export const onDemandParser =
  (options: XmlServerOptions, parser: Parser) =>
  async <T = Record<string, any>>(xml: string): Promise<T> => {
    const json = await parser.parseStringPromise(xml);
    if (options.assignOneElementArrays) assignOneElementArrays(json);
    return json as T;
  };
