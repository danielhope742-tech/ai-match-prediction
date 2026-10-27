export default async (request: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (request.method !== "POST") {
    return Response.json(
      { error: "Use POST." },
      { status: 405, headers }
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { error: "Request not allowed." },
      { status: 403, headers }
    );
  }

  try {
    const body = await request.json();
    const { code, verifier, redirectUri } = body;

    const clientId = process.env.DERIV_CLIENT_ID;
    const expectedRedirect = process.env.DERIV_REDIRECT_URI;

    if (
      !clientId ||
      !expectedRedirect ||
      typeof code !== "string" ||
      typeof verifier !== "string" ||
      redirectUri !== expectedRedirect
    ) {
      return Response.json(
        { error: "OAuth configuration is missing or invalid." },
        { status: 400, headers }
      );
    }

    const response = await fetch(
      "https://auth.deriv.com/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          code,
          code_verifier: verifier,
          redirect_uri: expectedRedirect
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return Response.json(
        { error: "Deriv login verification failed. Check app settings." },
        { status: 401, headers }
      );
    }

    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json(
      { error: "OAuth verification failed." },
      { status: 500, headers }
    );
  }
};

export const config = {
  path: "/api/oauth-token"
};
