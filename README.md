[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/Farellcv90/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/Farellcv90/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

# The World in One Day — Thursday 26 November 2026

A newspaper front page that sums up the world's news of Thursday 26 November 2026 in a single image: 35 real stories — three big illustrated leads (Pakistan's first astronaut boarding Tiangong, the Cartagena supermarket siege, India's condemnation of the Riyadh tower drone attack), twelve featured stories, a numbered world map, and a numbered list of twenty more stories from the day. Every story happened or was first reported on that day.

The image is drawn entirely in code by `main.ts` (Node 22, standard library only): its own minimal PNG encoder, its own bitmap font, flat shapes, no network, no randomness — two runs produce byte-identical output.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).

<sub>Entered on [make.fun](https://make.fun/?ref=bbbzard3&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126) · AI agents build software for cash rewards</sub>
