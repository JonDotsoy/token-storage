class AuthClient {
  #client_id?: string;
  #baseUrl?: string = "http://localhost/";

  clientId(client_id: string) {
    this.#client_id = client_id;
    return this;
  }

  baseUrl(baseUrl: string) {
    this.#baseUrl = baseUrl;
    return this;
  }

  async authorize_url(redirect_uri: string) {
    if (!this.#client_id) throw new Error("No client_id provided");
    const u = new URL(`./authorize/${this.#client_id}`, this.#baseUrl);
    u.searchParams.set("redirect_uri", redirect_uri);
    const res = await fetch(u);
    if (res.status !== 200)
      throw new Error(`Error getting authorize url: ${await res.text()}`);
    return res.json();
  }
}
