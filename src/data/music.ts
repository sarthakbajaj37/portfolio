// Playlists for the Music app.
//
// 👋 Sarthak: these are placeholder picks — swap in your own taste!
// Each track is a 30-second iTunes preview. To add a song, look it up with
//   curl "https://itunes.apple.com/search?term=<artist+song>&entity=song&limit=5&country=IN"
// and copy trackId / trackName / artistName / collectionName / artworkUrl100
// (change "100x100bb" to "600x600bb" for a sharper cover) / previewUrl / trackTimeMillis.
// If a previewUrl ever stops working, the player re-fetches it via the iTunes
// lookup API using the track id, so keep `id` accurate.

export type Track = {
  /** iTunes trackId */
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  previewUrl: string;
  durationMs: number;
};

export type Playlist = {
  id: string;
  name: string;
  description: string;
  /** Tailwind gradient classes used for the playlist cover (keep them literal). */
  gradient: string;
  tracks: Track[];
};

export const playlists: Playlist[] = 
[
  {
    "id": "focus-mode",
    "name": "Focus Mode",
    "description": "Lo-fi, ambient and instrumental for deep-work blocks and long code reviews.",
    "gradient": "from-indigo-500 to-sky-400",
    "tracks": [
      {
        "id": "1721843001",
        "title": "Aruarian Dance",
        "artist": "Nujabes",
        "album": "Samurai Champloo Music Record Departure",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/be/59/2b/be592b54-496f-bd59-9e46-49fa2f45a717/VICL-61411.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b7/37/ae/b737ae78-5aee-043e-807a-af878993ca7e/mzaf_4175871691801697475.plus.aac.p.m4a",
        "durationMs": 250433
      },
      {
        "id": "1078923526",
        "title": "Feather (feat. Cise Starr & Akin)",
        "artist": "Nujabes",
        "album": "Kei Nishikori Meets Nujabes",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/ad/18/6b/ad186b39-cd19-fa4d-abe0-bf6860cd8d9d/POCS-30003_jkt.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/57/94/1f/57941f7d-796f-3643-ac12-0e96c214e3e9/mzaf_10549193640541459923.plus.aac.p.m4a",
        "durationMs": 175693
      },
      {
        "id": "1063455505",
        "title": "Awake",
        "artist": "Tycho",
        "album": "Awake (Deluxe Version)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/59/c4/be/59c4be2c-7b16-d7c5-47ba-4790a4197f9b/804297820835.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/12/73/d1/1273d1de-6d57-abf5-1532-05600ea20775/mzaf_4782782749265763414.plus.aac.p.m4a",
        "durationMs": 283636
      },
      {
        "id": "1169246072",
        "title": "Kerala",
        "artist": "Bonobo",
        "album": "Migration",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/be/f1/d0/bef1d063-ed73-bd7d-3899-2217762cdcda/5054429005721.png/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7b/50/f2/7b50f2d2-4ead-9f1c-986f-a780d26a9d12/mzaf_3026587138333977214.plus.aac.p.m4a",
        "durationMs": 237547
      },
      {
        "id": "905056524",
        "title": "Soon It Will Be Cold Enough to Build Fires",
        "artist": "Emancipator",
        "album": "Soon It Will Be Cold Enough",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7d/11/0c/7d110c9d-6844-36be-75d9-126c792a10d1/859713069510_cover.tif/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/91/5c/13/915c131f-cd1a-38ed-699b-45d936ae3299/mzaf_2741502570728507573.plus.aac.p.m4a",
        "durationMs": 180520
      },
      {
        "id": "281116081",
        "title": "Roygbiv",
        "artist": "Boards of Canada",
        "album": "Music Has the Right to Children",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/b5/4c/c2/b54cc20d-03f5-f2c4-4a0d-9b51ad65af89/dj.txuslqgv.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/f3/e0/de/f3e0def5-52bf-f0e1-beea-523cbf8f6c1e/mzaf_15520357652152223442.plus.aac.p.m4a",
        "durationMs": 151520
      },
      {
        "id": "1390704156",
        "title": "saman",
        "artist": "Ólafur Arnalds",
        "album": "re:member",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/9b/20/71/9b20711d-7ffe-2b59-4bae-6d6f614a1451/18UMGIM24750.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/5b/4a/8e/5b4a8ef5-6d31-eab1-833d-c6d9e842f290/mzaf_11461226826114240306.plus.aac.p.m4a",
        "durationMs": 131923
      },
      {
        "id": "380350246",
        "title": "Time",
        "artist": "Hans Zimmer",
        "album": "Inception (Music from the Motion Picture)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/2b/62/eb/2b62ebd7-aa99-988a-0fee-714162f6fbeb/093624965008.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e0/1d/a4/e01da4a2-a75f-7ebf-9971-3d49e17efc57/mzaf_10500078769097048384.plus.aac.p.m4a",
        "durationMs": 275556
      }
    ]
  },
  {
    "id": "desi-hits",
    "name": "Desi Hits",
    "description": "Bollywood classics and Indian indie for the Bangalore commute.",
    "gradient": "from-orange-500 to-pink-500",
    "tracks": [
      {
        "id": "1534546293",
        "title": "cold/mess",
        "artist": "Prateek Kuhad",
        "album": "cold/mess",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/59/4f/41/594f4117-78b6-0699-340f-84bda46cbe6b/075679801531.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/b8/2d/80/b82d801a-1d64-d71f-ee8c-051757cdf53b/mzaf_16275896633706250850.plus.aac.p.m4a",
        "durationMs": 281219
      },
      {
        "id": "1519457069",
        "title": "Kasoor",
        "artist": "Prateek Kuhad",
        "album": "Kasoor - Single",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/60/d3/e9/60d3e9b3-4991-16bd-1468-ce522245c9e2/cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c6/34/7f/c6347fe4-d2a8-bf5e-2ca5-7438cce63f93/mzaf_585381111877766094.plus.aac.p.m4a",
        "durationMs": 197549
      },
      {
        "id": "1123241921",
        "title": "Kun Faya Kun",
        "artist": "A.R. Rahman, Javed Ali & Mohit Chauhan",
        "album": "Rockstar (Original Motion Picture Soundtrack)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/56/ac/41/56ac41f7-99f3-3eae-3b07-443167292c4e/8902894697408_cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ce/72/5e/ce725e63-6977-b281-3766-fff46d6e0c07/mzaf_7464998292185183397.plus.aac.p.m4a",
        "durationMs": 470500
      },
      {
        "id": "1073359419",
        "title": "Tum Hi Ho",
        "artist": "Mithoon & Arijit Singh",
        "album": "Aashiqui 2 (Original Motion Picture Soundtrack)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/bb/23/ee/bb23eeed-0c35-4f1d-2b11-485622777ae4/8902894353007_cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3a/8c/9b/3a8c9b0b-2def-750a-f615-1555bf941edf/mzaf_17229496441442805917.plus.aac.p.m4a",
        "durationMs": 261974
      },
      {
        "id": "1550578437",
        "title": "Udd Gaye",
        "artist": "Ritviz",
        "album": "Ved - EP",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e2/e5/6f/e2e56f3d-0491-338e-c8d2-0f147b07d092/859745100557_cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/20/a3/0f/20a30fea-e620-8d75-384d-2e06daed5943/mzaf_13309941552269230484.plus.aac.p.m4a",
        "durationMs": 180414
      },
      {
        "id": "1708026325",
        "title": "Baarishein",
        "artist": "Anuv Jain",
        "album": "Baarishein - Single",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/81/d1/2e/81d12e71-c993-272a-d559-5a1411f8d8ed/23UM1IM11036.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/de/84/d5/de84d517-ca82-fcc6-528e-2397c866d31c/mzaf_15371366101597876011.plus.aac.p.m4a",
        "durationMs": 207312
      },
      {
        "id": "1710464678",
        "title": "Choo Lo",
        "artist": "The Local Train",
        "album": "Aalas Ka Pedh",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/b4/ab/c3/b4abc3c3-bd25-b8cb-0011-4311e3f9497e/197189936111.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/54/eb/24/54eb2491-8858-bcbe-efe4-0c74ffd60dd0/mzaf_4910576119017201720.plus.aac.p.m4a",
        "durationMs": 233630
      },
      {
        "id": "1138970381",
        "title": "Dil Chahta Hai",
        "artist": "Shankar Mahadevan",
        "album": "Dil Chahta Hai (Original Motion Picture Soundtrack)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2b/df/62/2bdf6213-3d11-5f01-cc5e-ddfcc15923b4/8902894114844_cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fa/b7/81/fab78119-a64d-011b-7b12-86cec93956ff/mzaf_6150515912782371702.plus.aac.p.m4a",
        "durationMs": 310080
      }
    ]
  },
  {
    "id": "late-night-deploys",
    "name": "Late Night Deploys",
    "description": "Synths and big choruses for when the release train runs late.",
    "gradient": "from-violet-700 to-fuchsia-500",
    "tracks": [
      {
        "id": "1543825338",
        "title": "Derezzed",
        "artist": "Daft Punk",
        "album": "TRON: Legacy - The Complete Edition (Original Motion Picture Soundtrack)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ad/8c/1c/ad8c1cf2-e8d9-8bdd-13cc-7532736484a3/20UM1IM11916.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2b/cc/fa/2bccfa97-1dbf-2818-f218-e1329c2f1b0d/mzaf_3488091164580093132.plus.aac.p.m4a",
        "durationMs": 104113
      },
      {
        "id": "1674217008",
        "title": "Midnight City",
        "artist": "M83",
        "album": "Hurry up, We're Dreaming",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/73/c6/ed/73c6edb3-924c-27f0-28f8-1470906d6780/cover.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/74/a2/d3/74a2d361-c6bb-9880-a8d1-d999833d2891/mzaf_15783493292556356203.plus.aac.p.m4a",
        "durationMs": 243960
      },
      {
        "id": "1768051778",
        "title": "Nightcall",
        "artist": "Kavinsky, Angèle & Phoenix",
        "album": "Nightcall - Single",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/de/e1/61/dee16173-c361-9d23-9fbe-9ef3ad1daa46/24UM1IM00411.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c0/0f/b3/c00fb3dd-c7f3-9837-35d4-a800fd4175be/mzaf_612958025463318101.plus.aac.p.m4a",
        "durationMs": 179307
      },
      {
        "id": "1440870375",
        "title": "Starboy (feat. Daft Punk)",
        "artist": "The Weeknd",
        "album": "Starboy",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/11/71/d6/1171d6ad-3c96-e027-2af6-58028426588c/mzaf_15137631797407745471.plus.aac.p.m4a",
        "durationMs": 230461
      },
      {
        "id": "663097965",
        "title": "Do I Wanna Know?",
        "artist": "Arctic Monkeys",
        "album": "AM",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/69/9c/b5/699cb5d6-115c-ff73-9d26-e57ea4350d72/887828031795.png/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/71/cb/ba/71cbbaa1-016b-0e73-dfc2-9f4ede9ddfc0/mzaf_16266777024198047150.plus.aac.p.m4a",
        "durationMs": 272394
      },
      {
        "id": "1440838060",
        "title": "Let It Happen",
        "artist": "Tame Impala",
        "album": "Currents",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a8/2e/b4/a82eb490-f30a-a321-461a-0383c88fec95/15UMGIM23316.rgb.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/77/68/1f/77681ffc-56e6-813c-e1bc-d94a9b5893c1/mzaf_570579359857462588.plus.aac.p.m4a",
        "durationMs": 466893
      },
      {
        "id": "881985438",
        "title": "Feel Good Inc",
        "artist": "Gorillaz",
        "album": "The Singles Collection (2001-2011)",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/74/00/05/7400054f-d5e7-d63d-7b04-59eefcbfc836/825646290994.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/14/88/99/148899d1-f3e2-6be5-4850-1dc28b8b525f/mzaf_2296404456185734354.plus.aac.p.m4a",
        "durationMs": 221173
      },
      {
        "id": "528437514",
        "title": "Numb",
        "artist": "LINKIN PARK",
        "album": "Meteora",
        "artwork": "https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/dd/7d/72/dd7d7259-d27f-5b3e-ce64-9e304d2cb40f/dj.rxzrauer.jpg/600x600bb.jpg",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/93/dc/45/93dc455c-483f-8931-ef2e-cec30e2ed4bb/mzaf_3013383482601094146.plus.aac.p.m4a",
        "durationMs": 187508
      }
    ]
  }
]
;

export const allTracks: Track[] = Array.from(new Map(playlists.flatMap((p) => p.tracks).map((t) => [t.id, t])).values());

export function findTrack(id: string): Track | undefined {
  return allTracks.find((t) => t.id === id);
}
