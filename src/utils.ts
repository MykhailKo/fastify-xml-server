import rfdc from 'rfdc';

const clone = rfdc();

export function assignOneElementArrays(parentNode: Record<string, any>) {
  for (const [key, value] of Object.entries(parentNode)) {
    if (Array.isArray(value)) {
      if (value.length === 1) {
        if (typeof value[0] === 'object') assignOneElementArrays(value[0]);
        parentNode[key] = value[0];
      } else {
        parentNode[key] = value.map((el: any) => {
          if (typeof el === 'object') assignOneElementArrays(el);
          return el;
        });
      }
    }
  }
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
  const errorCode = error.code || httpStatus >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';

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
