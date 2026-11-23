Outage {
  id            uuid PK
  type          enum("POWER","INTERNET")
  provider      enum("KPLC","SAFARICOM","ZUKU","FAIBA")
  estate        text
  location      geography(point)
  status        enum("PENDING","ACTIVE","RESOLVED")
  reportedBy    uuid FK User
  reports       int          -- confirmation count
  stillOutVotes int
  backVotes     int
  reportedAt    timestamptz
  lastPromptAt  timestamptz
  resolvedAt    timestamptz
}

Scheduled {
  id        uuid PK
  provider  enum(...)
  estate    text
  startTime timestamptz
  endTime   timestamptz
  sourceUrl text
  addedBy   text   -- "manual:admin"
}

User {
  id               uuid PK
  telegramId       text UNIQUE
  followedEstates  text[]
  createdAt        timestamptz
}

Confirmation {
  id         uuid PK
  outageId   uuid FK Outage
  userId     uuid FK User
  kind       enum("CONFIRM","STILL_OUT","BACK")
  createdAt  timestamptz
  UNIQUE(outageId, userId, kind)  -- one vote per kind per user
}