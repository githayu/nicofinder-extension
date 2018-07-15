// @flow

type Ad = {
  vastMetaData: string,
}

type Audios = {
  id: string,
  available: boolean,
  bitrate: number,
  sampling_rate: number,
}

type AuthTypes = {
  http?: 'ht2',
  storyboard?: 'ht2',
}

type Channel = {
  id: string,
  name: string,
  favoriteToken: string,
  favoriteTokenTime: number,
  isFavorited: boolean,
  ngList: NgList[],
  threadType: string,
  globalId: string,
}

type CommentComposite = {
  threads: Threads[],
  layers: Layers[],
}

type Context = {
  playFrom: string,
  initialPlaybackPosition: string,
  initialPlaybackType: string,
  playLength: string,
  returnId: string,
  returnTo: string,
  returnMsg: string,
  watchId: string,
  isNoMovie: string,
  isNoRelatedVideo: string,
  isDownloadCompleteWait: string,
  isNoNicotic: string,
  isNeedPayment: boolean,
  isAdultRatingNG: boolean,
  isPlayable: string | boolean,
  isTranslatable: boolean,
  isTagUneditable: boolean,
  isVideoOwner: boolean,
  isThreadOwner: boolean,
  isOwnerThreadEditable: string,
  useChecklistCache: string,
  isDisabledMarquee: string,
  isDictionaryDisplayable: boolean,
  isDefaultCommentInvisible: boolean,
  accessFrom: string,
  csrfToken: string,
  translationVersionJsonUpdateTime: number,
  userkey: string,
  watchAuthKey: string,
  watchTrackId: string,
  watchPageServerTime: number,
  isAuthenticationRequired: boolean,
  isPeakTime: boolean,
  ngRevision: number,
  categoryName: string,
  categoryKey: string,
  categoryGroupName: string,
  categoryGroupKey: string,
  yesterdayRank: number,
  highestRank: number,
  isMyMemory: boolean,
  ownerNGList: OwnerNgList[],
  linkedChannelVideos: string,
  isAllowEmbedPlayer: boolean,
}

type DmcInfo = {
  time: number,
  time_ms: number,
  video: Video1,
  thread: Thread,
  user: User,
  import_version: number,
  error: string,
  session_api: SessionApi,
  storyboard_session_api: SessionApi,
  quality: Quality,
}

type Ids = {
  default: string,
  nicos: string,
  community: string,
}

type Items = {
  id: string,
  title: string,
  thumbnailURL: string,
  point: number,
  isHigh: boolean,
  elapsedTimeM: number,
  communityId: string,
  communityName: string,
}

type Layers = {
  index: number,
  isTranslucent: boolean,
  threadIds: ThreadIds[],
}

type Lead = {
  tagRelatedMarquee: string | TagRelatedMarquee,
  tagRelatedBanner: string,
  nicosdkApplicationBanner: string,
  videoEndBannerIn: string,
  videoEndOverlay: string,
}

type LiveTopics = {
  items: Items[],
}

type Owner = {
  id: string,
  nickname: string,
  iconURL: string,
  nicoliveInfo: string,
  channelInfo: string,
  isUserVideoPublic: boolean,
  isUserMyVideoPublic: boolean,
  isUserOpenListPublic: boolean,
}

type OwnerNgList = {
  source: string,
  destination: string,
}

type NgList = {
  source: string,
  destination: string,
}

type Player = {
  playerInfoXMLUpdateTIme: number,
  isContinuous: boolean,
}

type Playlist = {
  watchId: string,
  referer: string,
  parameter: string,
}

type Quality = {
  videos: Videos[],
  audios: Audios[],
}

type Resolution = {
  width: number,
  height: number,
}

export type WatchInfo = {
  video: Video,
  player: Player,
  thread: Thread1,
  commentComposite: CommentComposite,
  tags: Tags[],
  playlist: Playlist,
  owner: Owner | string,
  viewer: Viewer,
  community: string,
  mainCommunity: string,
  channel: Channel | string,
  ad: Ad,
  lead: Lead,
  maintenance: string,
  context: Context,
  liveTopics: LiveTopics,
}

export type SessionApi = {
  recipe_id: string,
  player_id: string,
  videos: string[],
  audios: any[],
  movies: any[],
  protocols: string[],
  auth_types: AuthTypes,
  service_user_id: string,
  token: string,
  signature: string,
  content_id: string,
  heartbeat_lifetime: number,
  content_key_timeout: number,
  priority: number,
  transfer_presets: any[],
  urls: Urls[],
}

type SmileInfo = {
  url: string,
  isSlowLine: boolean,
  currentQualityId: string,
  qualityIds: string[],
}

type TagRelatedMarquee = {
  id: string,
  url: string,
  title: string,
}

type Tags = {
  id: string,
  name: string,
  isCategory: boolean,
  isCategoryCandidate: boolean,
  isDictionaryExists: boolean,
  isLocked: boolean,
}

type Thread = {
  server_url: string,
  sub_server_url: string,
  thread_id: number,
  nicos_thread_id: string,
  optional_thread_id: string | number,
  thread_key_required: boolean,
  channel_ng_words: any[],
  owner_ng_words: any[],
  maintenances_ng: boolean,
  postkey_available: boolean,
  ng_revision: number,
}

type Thread1 = {
  commentCount: number,
  hasOwnerThread: string,
  mymemoryLanguage: string,
  serverUrl: string,
  subServerUrl: string,
  ids: Ids,
}

type ThreadIds = {
  id: number,
  fork: number,
}

type Threads = {
  id: number,
  fork: number,
  isActive: boolean,
  postkeyStatus: number,
  isDefaultPostTarget: boolean,
  isThreadkeyRequired: boolean,
  isLeafRequired: boolean,
  label: string,
  isOwnerThread: boolean,
  hasNicoscript: boolean,
}

type Urls = {
  url: string,
  is_well_known_port: boolean,
  is_ssl: boolean,
}

type User = {
  user_id: number,
  is_premium: boolean,
  nickname: string,
}

type Video = {
  id: string,
  title: string,
  originalTitle: string,
  description: string,
  originalDescription: string,
  thumbnailURL: string,
  largeThumbnailURL: string,
  postedDateTime: string,
  originalPostedDateTime: string,
  width: number,
  height: number,
  duration: number,
  viewCount: number,
  mylistCount: number,
  translation: boolean,
  translator: string,
  movieType: string,
  badges: string,
  mainCommunityId: string,
  dmcInfo: DmcInfo,
  backCommentType: string,
  channelId: string,
  isCommentExpired: boolean,
  isWide: string,
  isOfficialAnime: string | number,
  isNoBanner: string,
  isDeleted: boolean,
  isTranslated: boolean,
  isR18: boolean,
  isAdult: boolean,
  isNicowari: string,
  isPublic: boolean,
  isPublishedNicoscript: string,
  isNoNGS: string,
  isCommunityMemberOnly: string,
  isCommonsTreeExists: boolean,
  isNoIchiba: boolean,
  isOfficial: boolean,
  isMonetized: boolean,
  smileInfo: SmileInfo,
}

type Video1 = {
  video_id: string,
  length_seconds: number,
  deleted: number,
}

type Videos = {
  id: string,
  available: boolean,
  bitrate: number,
  resolution: Resolution,
}

type Viewer = {
  id: number,
  nickname: string,
  prefecture: number,
  sex: number,
  age: number,
  isPremium: boolean,
  isPrivileged: boolean,
  isPostLocked: boolean,
  isHtrzm: boolean,
  isTwitterConnection: boolean,
  nicosid: string,
}
