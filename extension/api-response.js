export function normalizeApiResponse(status, data) {
  if (status >= 200 && status < 300) {
    return { ok: true, status, data };
  }

  const fallback = {
    401: "Connect your OfferOS account again.",
    403: "Your OfferOS account cannot perform this action.",
    422: "Check the detected job details and try again.",
  }[status] || "OfferOS could not complete this request.";

  return {
    ok: false,
    status,
    error: data?.error?.message || fallback,
  };
}

export function captureState(response) {
  if (!response?.ok) return "error";
  if (response.data?.status === "duplicate") return "duplicate";
  if (response.data?.status === "created" && response.data?.application?.id) {
    return "created";
  }
  return "invalid";
}
