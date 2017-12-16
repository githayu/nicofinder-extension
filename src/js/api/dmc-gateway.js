export default class DMCGateway {
  constructor(dmcInfo) {
    this.dmcInfo = dmcInfo;
  }

  get getEndpointURL() {
    return new URL(this.dmcInfo.urls[0].url);
  }

  get getSessionURL() {
    return new URL(`${this.getEndpointURL}/${this.session.id}`);
  }

  async startSession(request = {}) {
    await this.postSession(request);

    this.continuousId = setInterval(() => this.updateSession(), 20000);

    return Promise.resolve(this.session);
  }

  async deleteSession() {
    const url = this.getSessionURL;
    url.searchParams.append('_format', 'json');

    const response = await this.fetchSession(url, {
      method: 'DELETE',
      body: JSON.stringify({
        session: this.session
      })
    });

    clearInterval(this.continuousId);
    this.session = null;
    return Promise.resolve(response);
  }

  async updateSession() {
    const url = this.getSessionURL;
    url.searchParams.append('_format', 'json');

    const response = await this.fetchSession(url, {
      method: 'PUT',
      body: JSON.stringify({
        session: this.session
      })
    });

    this.session = response.data.session;
    return Promise.resolve(response);
  }

  async postSession(request = {}) {
    const url = this.getEndpointURL;
    url.searchParams.append('_format', 'json');

    const response = await this.fetchSession(url, {
      method: 'POST',
      body: JSON.stringify(
        this.createSessionRequest(request)
      )
    });

    this.session = response.data.session;
    return Promise.resolve(response);
  }

  async fetchSession(url, request) {
    const defaultRequest = {
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };

    const response = await fetch(
      url,
      Object.assign({}, defaultRequest, request)
    );

    if (!response.ok) {
      console.error(response);
      clearInterval(this.continuousId);
      return Promise.reject(new Error('Dmc Session'));
    }

    const result = await response.json();

    return Promise.resolve(result);
  }

  createSessionRequest(request = {}) {
    const {
      player_id,
      content_id,
      service_user_id,
      recipe_id,
      auth_types,
      content_key_timeout,
      heartbeat_lifetime,
      audios,
      videos,
      signature,
      token,
      protocols,
      priority
    } = Object.assign({}, this.dmcInfo, request);

    return {
      session: {
        client_info: {
          player_id: player_id
        },
        content_auth: {
          auth_type: auth_types.http,
          content_key_timeout: content_key_timeout,
          max_content_count: 10,
          service_id: 'nicovideo',
          service_user_id: service_user_id
        },
        content_id: content_id,
        content_src_id_sets: [
          {
            content_src_ids: [
              {
                src_id_to_mux: {
                  audio_src_ids: audios,
                  video_src_ids: videos
                }
              }
            ]
          }
        ],
        content_type: 'movie',
        content_uri: '',
        keep_method: {
          heartbeat: {
            lifetime: heartbeat_lifetime
          }
        },
        priority: priority,
        protocol: {
          name: protocols[0],
          parameters: {
            http_parameters: {
              method: 'GET',
              parameters: {
                http_output_download_parameters: {
                  file_extension: 'mp4'
                }
              }
            }
          }
        },
        recipe_id: recipe_id,
        session_operation_auth: {
          session_operation_auth_by_signature: {
            signature: signature,
            token: token
          }
        },
        timing_constraint: 'unlimited'
      }
    };
  }
}
