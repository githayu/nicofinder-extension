// @flow

import { Utils } from '../utils'
import type { SessionApi } from 'js/types'

export default class DMCGateway {
  dmcInfo: SessionApi
  session: any
  storyboard: any
  continuousId: any

  constructor(dmcInfo: SessionApi) {
    this.dmcInfo = dmcInfo
  }

  get getEndpointURL() {
    return new URL(this.dmcInfo.urls[0].url)
  }

  get getSessionURL() {
    return new URL(`${this.getEndpointURL.href}/${this.session.id}`)
  }

  async startSession(request: RequestOptions = {}) {
    await this.postSession(request)

    if (this.session.content_id.startsWith('sb_out')) {
      const { data: sbData = null } = await this.fetchSession(
        this.session.content_uri
      ).catch(() => ({}))

      this.storyboard = sbData
    } else {
      this.continuousId = setInterval(() => this.updateSession(), 20000)
    }

    return this.session
  }

  async deleteSession() {
    const url = this.getSessionURL
    url.searchParams.append('_format', 'json')

    const response = await this.fetchSession(url, {
      method: 'DELETE',
      body: JSON.stringify({
        session: this.session,
      }),
    })

    clearInterval(this.continuousId)
    this.session = null
    return response
  }

  async updateSession() {
    const url = this.getSessionURL
    url.searchParams.append('_format', 'json')

    const response = await this.fetchSession(url, {
      method: 'PUT',
      body: JSON.stringify({
        session: this.session,
      }),
    })

    this.session = response.data.session
    return response
  }

  async postSession(request: RequestOptions = {}) {
    const url = this.getEndpointURL
    url.searchParams.append('_format', 'json')

    const response = await this.fetchSession(url, {
      method: 'POST',
      body: JSON.stringify(this.createSessionRequest(request)),
    })

    this.session = response.data.session

    return response
  }

  async fetchSession(url: URL, request: RequestOptions = {}) {
    const response = await Utils.fetch({
      request: {
        url: url.href,
        request: {
          headers: {
            'Content-Type': 'application/json',
          },
          ...request,
        },
        responseType: 'json',
      },
      viaBackground: true,
    })

    if (!response) {
      clearInterval(this.continuousId)
      return Promise.reject(new Error('Dmc Session'))
    }

    return response
  }

  createSessionRequest(request: RequestOptions = {}) {
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
      transfer_presets,
      priority,
    } = Object.assign({}, this.dmcInfo, request)

    const isStoryboard = content_id.startsWith('sb_out1')
    const authType = isStoryboard ? auth_types.storyboard : auth_types.http
    const contentType = isStoryboard ? 'video' : 'movie'
    const contentSrcIds = isStoryboard
      ? videos
      : [
          {
            src_id_to_mux: {
              audio_src_ids: audios,
              video_src_ids: videos,
            },
          },
        ]

    const parameters = isStoryboard
      ? {
          storyboard_download_parameters: {
            use_ssl: 'yes',
            use_well_known_port: 'no',
          },
        }
      : {
          http_output_download_parameters: {
            transfer_preset: transfer_presets[0],
            use_ssl: 'yes',
            use_well_known_port: 'no',
          },
        }

    return {
      session: {
        client_info: {
          player_id: player_id,
        },
        content_auth: {
          auth_type: authType,
          content_key_timeout: content_key_timeout,
          service_id: 'nicovideo',
          service_user_id: service_user_id,
        },
        content_id: content_id,
        content_src_id_sets: [
          {
            content_src_ids: contentSrcIds,
          },
        ],
        content_type: contentType,
        content_uri: '',
        keep_method: {
          heartbeat: {
            lifetime: heartbeat_lifetime,
          },
        },
        priority: priority,
        protocol: {
          name: 'http',
          parameters: {
            http_parameters: {
              parameters: parameters,
            },
          },
        },
        recipe_id: recipe_id,
        session_operation_auth: {
          session_operation_auth_by_signature: {
            signature: signature,
            token: token,
          },
        },
        timing_constraint: 'unlimited',
      },
    }
  }
}
