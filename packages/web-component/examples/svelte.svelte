<!--
  Svelte example for <lightbird-player>.

  Drop this component into any Svelte (or SvelteKit) project that depends on
  `@lightbird/player`. Svelte treats hyphenated tags as custom elements out of the
  box: it sets attributes and `on:` listeners with no extra configuration.
-->
<script>
  // Importing the package registers the <lightbird-player> element.
  import '@lightbird/player';

  let currentTime = 0;
  const src =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  const subtitles = JSON.stringify([
    { src: '/subs/en.vtt', label: 'English', srclang: 'en', default: true },
  ]);

  function handleTimeUpdate(event) {
    currentTime = event.detail.currentTime;
  }
</script>

<h1>Svelte + &lt;lightbird-player&gt;</h1>

<lightbird-player
  {src}
  {subtitles}
  controls
  on:timeupdate={handleTimeUpdate}
></lightbird-player>

<p>Current time: {currentTime.toFixed(1)}s</p>

<style>
  lightbird-player {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
</style>
