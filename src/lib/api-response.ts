export function apiJson<T>(body: T, status = 200) {
  return Response.json(body, { status });
}

export function apiError(message: string, status: number) {
  return apiJson({ error: message }, status);
}

export function unauthorizedError() {
  return apiError("Unauthorized", 401);
}

export function badRequestError(message: string) {
  return apiError(message, 400);
}

export function notFoundError(message: string) {
  return apiError(message, 404);
}

export function internalServerError(message = "Something went wrong") {
  return apiError(message, 500);
}
