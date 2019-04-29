declare namespace nicovideo {
  interface WatchInfo {
    video: Video
    player: Player
    thread: Thread1
    commentComposite: CommentComposite
    tags: Tags[]
    playlist: Playlist
    owner: Owner | string
    viewer: Viewer
    community: string
    mainCommunity: string
    channel: Channel | string
    ad: Ad
    lead: Lead
    maintenance: string
    context: Context
    liveTopics: LiveTopics
  }
}

interface Ad {
  vastMetaData: string
}

interface Audios {
  id: string
  available: boolean
  bitrate: number
  sampling_rate: number
}

interface AuthTypes {
  http?: 'ht2'
  storyboard?: 'ht2'
}

interface Channel {
  id: string
  name: string
  favoriteToken: string
  favoriteTokenTime: number
  isFavorited: boolean
  ngList: NgList[]
  threadType: string
  globalId: string
}

interface CommentComposite {
  threads: Threads[]
  layers: Layers[]
}

interface Context {
  playFrom: string
  initialPlaybackPosition: string
  initialPlaybackType: string
  playLength: string
  returnId: string
  returnTo: string
  returnMsg: string
  watchId: string
  isNoMovie: string
  isNoRelatedVideo: string
  isDownloadCompleteWait: string
  isNoNicotic: string
  isNeedPayment: boolean
  isAdultRatingNG: boolean
  isPlayable: string | boolean
  isTranslatable: boolean
  isTagUneditable: boolean
  isVideoOwner: boolean
  isThreadOwner: boolean
  isOwnerThreadEditable: string
  useChecklistCache: string
  isDisabledMarquee: string
  isDictionaryDisplayable: boolean
  isDefaultCommentInvisible: boolean
  accessFrom: string
  csrfToken: string
  translationVersionJsonUpdateTime: number
  userkey: string
  watchAuthKey: string
  watchTrackId: string
  watchPageServerTime: number
  isAuthenticationRequired: boolean
  isPeakTime: boolean
  ngRevision: number
  categoryName: string
  categoryKey: string
  categoryGroupName: string
  categoryGroupKey: string
  yesterdayRank: number
  highestRank: number
  isMyMemory: boolean
  ownerNGList: OwnerNgList[]
  linkedChannelVideos: string
  isAllowEmbedPlayer: boolean
}

interface DmcInfo {
  time: number
  time_ms: number
  video: Video1
  thread: Thread
  user: User
  import_version: number
  error: string
  session_api: SessionApi
  storyboard_session_api: SessionApi
  quality: Quality
}

interface Ids {
  default: string
  nicos: string
  community: string
}

interface Items {
  id: string
  title: string
  thumbnailURL: string
  point: number
  isHigh: boolean
  elapsedTimeM: number
  communityId: string
  communityName: string
}

interface Layers {
  index: number
  isTranslucent: boolean
  threadIds: ThreadIds[]
}

interface Lead {
  tagRelatedMarquee: string | TagRelatedMarquee
  tagRelatedBanner: string
  nicosdkApplicationBanner: string
  videoEndBannerIn: string
  videoEndOverlay: string
}

interface LiveTopics {
  items: Items[]
}

interface Owner {
  id: string
  nickname: string
  iconURL: string
  nicoliveInfo: string
  channelInfo: string
  isUserVideoPublic: boolean
  isUserMyVideoPublic: boolean
  isUserOpenListPublic: boolean
}

interface OwnerNgList {
  source: string
  destination: string
}

interface NgList {
  source: string
  destination: string
}

interface Player {
  playerInfoXMLUpdateTIme: number
  isContinuous: boolean
}

interface Playlist {
  watchId: string
  referer: string
  parameter: string
}

interface Quality {
  videos: Videos[]
  audios: Audios[]
}

interface Resolution {
  width: number
  height: number
}

interface SessionApi {
  recipe_id: string
  player_id: string
  videos: string[]
  audios: any[]
  movies: any[]
  protocols: string[]
  auth_types: AuthTypes
  service_user_id: string
  token: string
  signature: string
  content_id: string
  heartbeat_lifetime: number
  content_key_timeout: number
  priority: number
  transfer_presets: any[]
  urls: Urls[]
}

interface SmileInfo {
  url: string
  isSlowLine: boolean
  currentQualityId: string
  qualityIds: string[]
}

interface TagRelatedMarquee {
  id: string
  url: string
  title: string
}

interface Tags {
  id: string
  name: string
  isCategory: boolean
  isCategoryCandidate: boolean
  isDictionaryExists: boolean
  isLocked: boolean
}

interface Thread {
  server_url: string
  sub_server_url: string
  thread_id: number
  nicos_thread_id: string
  optional_thread_id: string | number
  thread_key_required: boolean
  channel_ng_words: any[]
  owner_ng_words: any[]
  maintenances_ng: boolean
  postkey_available: boolean
  ng_revision: number
}

interface Thread1 {
  commentCount: number
  hasOwnerThread: string
  mymemoryLanguage: string
  serverUrl: string
  subServerUrl: string
  ids: Ids
}

interface ThreadIds {
  id: number
  fork: number
}

interface Threads {
  id: number
  fork: number
  isActive: boolean
  postkeyStatus: number
  isDefaultPostTarget: boolean
  isThreadkeyRequired: boolean
  isLeafRequired: boolean
  label: string
  isOwnerThread: boolean
  hasNicoscript: boolean
}

interface Urls {
  url: string
  is_well_known_port: boolean
  is_ssl: boolean
}

interface User {
  user_id: number
  is_premium: boolean
  nickname: string
}

interface Video {
  id: string
  title: string
  originalTitle: string
  description: string
  originalDescription: string
  thumbnailURL: string
  largeThumbnailURL: string
  postedDateTime: string
  originalPostedDateTime: string
  width: number
  height: number
  duration: number
  viewCount: number
  mylistCount: number
  translation: boolean
  translator: string
  movieType: string
  badges: string
  mainCommunityId: string
  dmcInfo: DmcInfo
  backCommentType: string
  channelId: string
  isCommentExpired: boolean
  isWide: string
  isOfficialAnime: string | number
  isNoBanner: string
  isDeleted: boolean
  isTranslated: boolean
  isR18: boolean
  isAdult: boolean
  isNicowari: string
  isPublic: boolean
  isPublishedNicoscript: string
  isNoNGS: string
  isCommunityMemberOnly: string
  isCommonsTreeExists: boolean
  isNoIchiba: boolean
  isOfficial: boolean
  isMonetized: boolean
  smileInfo: SmileInfo
}

interface Video1 {
  video_id: string
  length_seconds: number
  deleted: number
}

interface Videos {
  id: string
  available: boolean
  bitrate: number
  resolution: Resolution
}

interface Viewer {
  id: number
  nickname: string
  prefecture: number
  sex: number
  age: number
  isPremium: boolean
  isPrivileged: boolean
  isPostLocked: boolean
  isHtrzm: boolean
  isTwitterConnection: boolean
  nicosid: string
}
