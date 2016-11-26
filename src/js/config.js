export const baseURL = {
  nicofinder: {
    top: 'http://www.nicofinder.net'
  },
  nicoapi: {
    videoInfo: 'http://api.ce.nicovideo.jp/nicoapi/v1/video.info'
  }
};

export const defaultStorage = {
  extension: {
    local: {
      redirect: false,
      redirectList: [
        'watch',
        'mylist'
      ],
      webFeatures: false
    }
  }
};

export const threadFetchResultCode = [
  { key: 'Found', code: 0 },
  { key: 'NotFound', code: 1 },
  { key: 'Invalid', code: 2 },
  { key: 'Version', code: 3 },
  { key: 'InvalidWayBackKey', code: 4 },
  { key: 'TooOldWayBackKey', code: 5 },
  { key: 'InvalidAdminKey', code: 6 },
  { key: 'TooOldAdminKey', code: 7 },
  { key: 'InvalidThreadKey', code: 8 },
  { key: 'TooOldThreadKey', code: 9 },
  { key: 'AdminConflict', code: 10 },
  { key: 'LeafNotActivated', code: 11 },
  { key: 'LeafLoading', code: 12 },
  { key: 'InvalidLanguage', code: 13 },
  { key: 'InvalidUserKey', code: 14 },
  { key: 'TooOldUserKey', code: 15 },
  { key: 'ConflictUserKeyAndOtherKey', code: 16 },
  { key: 'UserConflict', code: 17 }
];

export const threadPostResultCode = [
  { key: 'Success', code: 0 },
  { key: 'Failure', code: 1 },
  { key: 'InvalidThread', code: 2 },
  { key: 'InvalidTicket', code: 3 },
  { key: 'InvalidPostKey', code: 4 },
  { key: 'Locked', code: 5 },
  { key: 'ReadOnly', code: 6 },
  { key: 'NotImplemented', code: 7 },
  { key: 'Invalid184', code: 8 }
];
