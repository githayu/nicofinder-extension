declare namespace nicovideo.API {
  interface VideoInfo {
    nicovideo_video_response: Nicovideovideoresponse
  }
}

interface Nicovideovideoresponse {
  video: Video
  thread: Thread
  tags: Tags
  '@status': string
}

interface Tags {
  tag_info: Taginfo[]
}

interface Taginfo {
  tag: string
  area: string
}

interface Thread {
  id: string
  num_res: string
  summary: string
  community_id: string
  group_type: string
}

interface Video {
  id: string
  user_id: string
  deleted: string
  title: string
  description: string
  length_in_seconds: string
  thumbnail_url: string
  upload_time: string
  first_retrieve: string
  default_thread: string
  view_counter: string
  mylist_counter: string
  option_flag_community: string
  option_flag_nicowari: string
  option_flag_middle_thumbnail: string
  option_flag_dmc_play: string
  community_id: string
  vita_playable: string
  ppv_video: string
  permission: string
  provider_type: string
  options: Options
}

interface Options {
  '@mobile': string
  '@sun': string
  '@large_thumbnail': string
  '@adult': string
}
