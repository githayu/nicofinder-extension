import { Utils } from './utils';

export default class NicoAPI {
  static async getflv(qs) {
    return await Utils.xhr({
      method: 'post',
      url: 'http://flapi.nicovideo.jp/api/getflv',
      type: 'text',
      qs
    })
    .then(res => Utils.decodeURLParams(res));
  }

  static async getNicoHistory(id, qs) {
    return await Utils.xhr({
      method: 'post',
      url: `http://www.nicovideo.jp/watch/${id}`,
      type: 'text',
      qs
    });
  }

  static async getStoryboard(url) {
    return await Utils.xhr({
      url,
      type: 'xml',
      qs: {
        sb: 1
      }
    })
    .then(xml => Utils.xmlChildrenParser(xml.children).smile);
  }

  static async dmcSession(mode, dmcInfo, session) {
    var body,
        url = new URL(dmcInfo.api_urls[0]),
        contentType = 'xml',
        qs = {
          _format: contentType,
          suppress_response_codes: true
        };

    switch (mode) {
      case 'get': {
        body = this.createDmcSession(dmcInfo, contentType);
        break;
      }

      case 'delete': {
        url.pathname += '/' + session.getElementsByTagName('id')[0].innerHTML;
        body = session.outerHTML;
        qs._method = 'DELETE';
        break;
      }

      case 'put': {
        url.pathname += '/' + session.getElementsByTagName('id')[0].innerHTML;
        body = session.outerHTML;
        qs._method = 'PUT';
        break;
      }
    }

    var response = await Utils.xhr({
      url,
      method: 'post',
      type: contentType,
      body,
      qs,
    });

    switch (contentType) {
      case 'xml': {
        let metaElement = response.getElementsByTagName('meta')[0],
            sessionElement = response.getElementsByTagName('session')[0];

        if (session === null && metaElement.attributes.status.value != 201 ||
            session !== null && metaElement.attributes.status.value != 200) {
          return Promise.reject(
            metaElement.attributes.status.value,
            metaElement.attributes.message.value
          );
        }

        return Promise.resolve(sessionElement);
      }

      case 'json': {
        // 未対応
        break;
      }
    }
  }

  static createDmcSession(dmcInfo, format) {
    if (format === 'xml') {
      return `
        <session>
          <recipe_id>${dmcInfo.recipe_id}</recipe_id>
          <content_id>${dmcInfo.content_id}</content_id>
          <content_type>movie</content_type>
          <protocol>
            <name>${dmcInfo.protocols[0]}</name>
            <parameters>
              <http_parameters>
                <method>GET</method>
                <parameters>
                  <http_output_download_parameters>
                    <file_extension>mp4</file_extension>
                  </http_output_download_parameters>
                </parameters>
              </http_parameters>
            </parameters>
          </protocol>
          <priority>${dmcInfo.priority}</priority>
          <content_src_id_sets>
            <content_src_id_set>
              <content_src_ids>
                <src_id_to_mux>
                  <video_src_ids>
                    ${dmcInfo.videos.map(video => `<string>${video}</string>`).join('')}
                  </video_src_ids>
                  <audio_src_ids>
                    ${dmcInfo.audios.map(audio => `<string>${audio}</string>`).join('')}
                  </audio_src_ids>
                </src_id_to_mux>
              </content_src_ids>
            </content_src_id_set>
          </content_src_id_sets>
          <keep_method>
            <heartbeat>
              <lifetime>${dmcInfo.heartbeat_lifetime}</lifetime>
            </heartbeat>
          </keep_method>
          <timing_constraint>unlimited</timing_constraint>
          <session_operation_auth>
            <session_operation_auth_by_signature>
              <token>${dmcInfo.token}</token>
              <signature>${dmcInfo.signature}</signature>
            </session_operation_auth_by_signature>
          </session_operation_auth>
          <content_auth>
            <auth_type>${dmcInfo.auth_types.http}</auth_type>
            <service_id>nicovideo</service_id>
            <service_user_id>${dmcInfo.service_user_id}</service_user_id>
            <max_content_count>10</max_content_count>
            <content_key_timeout>${dmcInfo.content_key_timeout}</content_key_timeout>
          </content_auth>
          <client_info>
            <player_id>${dmcInfo.player_id}</player_id>
          </client_info>
        </session>
      `.replace(/\s/g, '');
    } else {
      return JSON.stringify({
        recipe_id: dmcInfo.recipe_id,
        content_id: dmcInfo.content_id,
        content_type: 'movie',
        protocol: {
          name: 'http',
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
        priority: dmcInfo.priority,
        content_src_id_sets: {
          content_src_id_set: {
            content_src_ids: {
              src_id_to_mux: {
                video_src_ids: dmcInfo.videos,
                audio_src_ids: dmcInfo.audios
              }
            }
          }
        },
        keep_method: {
          heartbeat: {
            lifetime: dmcInfo.heartbeat_lifetime
          }
        },
        timing_constraint: 'unlimited',
        session_operation_auth: {
          session_operation_auth_by_signature: {
            token: dmcInfo.token,
            signature: dmcInfo.signature
          }
        },
        content_auth: {
          auth_type: dmcInfo.auth_types.http,
          service_id: 'nicovideo',
          service_user_id: dmcInfo.service_user_id,
          max_content_count: 10,
          content_key_timeout: dmcInfo.content_key_timeout
        },
        client_info: {
          player_id: dmcInfo.player_id
        }
      });
    }
  }
};
