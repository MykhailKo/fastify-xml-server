import { FastifyError, FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { Builder, Parser } from 'xml2js';

import { XmlServerOptions } from './types';
import * as defaults from './defaults';
import { addXmlWrapper, assignOneElementArrays, checkContentTypeSupport, dropNamespacePrefixes, errorTranslator, onDemandParser } from './utils';

const defaultOptions: XmlServerOptions = {
  parserOptions: { explicitRoot: false, ignoreAttrs: true },
  serializerOptions: { renderOpts: { pretty: false } },
  errorTranslator,
  wrapper: defaults.wrapper,
  contentType: ['application/xml', 'text/xml'],
  assignOneElementArrays: true,
  propagateRawXml: false,
  dropNamespacePrefixes: false,
};

const defaultParser = new Parser(defaultOptions.parserOptions);

export let parseXml = onDemandParser(defaultOptions, defaultParser);

const plugin: FastifyPluginCallback<XmlServerOptions> = (
  server: FastifyInstance,
  options: XmlServerOptions,
  done: (error?: FastifyError) => void
) => {
  const resOptions = { ...defaultOptions, ...options } as Required<XmlServerOptions>;
  const ignoredXmlKeys = [options.serializerOptions?.attrkey ?? '$', options.parserOptions?.charkey ?? '_'];

  const parser = new Parser(resOptions.parserOptions);
  const serializer = new Builder(resOptions.serializerOptions);

  parseXml = onDemandParser(resOptions, parser);

  server.setNotFoundHandler((req, rep) => {
    const errorPayload = errorTranslator({ code: 'NOT_FOUND', message: 'URL path not found' });
    const wrappedPayload = addXmlWrapper(errorPayload, resOptions.wrapper, ignoredXmlKeys);
    const xmlPayload = serializer.buildObject(wrappedPayload);

    rep.status(404).send(xmlPayload);
  });

  server.addHook('onRequest', (req, rep, next) => {
    if (req.headers['content-type'] && !checkContentTypeSupport(req.headers['content-type'], resOptions.contentType)) {
      rep.status(415).send('Unsupported Media Type');
    }
    next();
  });

  server.addContentTypeParser(resOptions.contentType, { parseAs: 'string' }, (req, xmlPayload, next) => {
    if (resOptions.propagateRawXml) Object.assign(req, { rawXml: xmlPayload });
    parser.parseString(xmlPayload, (err: any, json: Record<string, any>) => {
      if (err) next(err, null);
      if (resOptions.assignOneElementArrays) assignOneElementArrays(json);
      if (resOptions.dropNamespacePrefixes) dropNamespacePrefixes(json);
      next(null, json);
    });
  });

  server.setErrorHandler((error, req, rep) => {
    console.log(JSON.stringify(error));
    const httpStatus = error.statusCode || 500;

    const errorPayload = resOptions.errorTranslator(error);
    const wrappedPayload = addXmlWrapper(errorPayload, resOptions.wrapper, ignoredXmlKeys);
    const xmlPayload = serializer.buildObject(wrappedPayload);

    rep.status(httpStatus).send(xmlPayload);
  });

  server.setReplySerializer((payload, statusCode) => {
    const wrappedPayload = addXmlWrapper(payload as Record<string, any>, resOptions.wrapper, ignoredXmlKeys);
    const xmlPayload = serializer.buildObject(wrappedPayload);
    return xmlPayload;
  });

  server.addHook('onSend', (req, rep, payload, next) => {
    rep.header('Content-Type', resOptions.contentType[0]);
    next(null, payload);
  });

  done();
};

export const fastifyXmlServer = fp(plugin, { name: 'fastify-xml-server', fastify: '4.x' });
