import { csrfRejectIfInvalid } from "@/lib/csrf";

type MaybePromise<T> = T | Promise<T>;

type RouteHandler<TRequest extends Request = Request, TArgs extends unknown[] = []> = (
  req: TRequest,
  ...args: TArgs
) => MaybePromise<Response>;

export function withCsrfProtection<
  TRequest extends Request = Request,
  TArgs extends unknown[] = [],
>(handler: RouteHandler<TRequest, TArgs>): RouteHandler<TRequest, TArgs> {
  return async (req, ...args) => {
    const csrfError = csrfRejectIfInvalid(req);
    if (csrfError) {
      return csrfError;
    }

    return handler(req, ...args);
  };
}
