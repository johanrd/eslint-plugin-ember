# ember/template-no-autoplay

<!-- end auto-generated rule header -->

This rule disallows the `autoplay` attribute on `<audio>` elements, and on
`<video>` elements that are not also marked `muted`.

Autoplaying audio is disruptive for users with cognitive or sensory
sensitivities, can interfere with screen readers, and consumes bandwidth
without user consent. WCAG Success Criterion 1.4.2 requires users to be able
to pause, stop, or control audio that plays automatically for more than three
seconds. The [W3C ACT rule `aaa1bf`][act-aaa1bf] that operationalizes SC 1.4.2
is explicitly inapplicable when the media is muted or has no audio, so a
muted autoplaying `<video>` (e.g. GIF-style hero) is treated as allowed.

[act-aaa1bf]: https://www.w3.org/WAI/standards-guidelines/act/rules/aaa1bf/proposed/

## Examples

This rule **forbids** the following:

```hbs
<audio src='track.mp3' autoplay></audio>
<video src='clip.mp4' autoplay></video>
<audio src='track.mp3' autoplay muted></audio>
<video src='clip.mp4' autoplay muted={{false}}></video>
```

This rule **allows** the following:

```hbs
<audio src='track.mp3' controls></audio>
<video src='clip.mp4' controls></video>
<audio src='track.mp3' autoplay={{false}}></audio>
<video src='clip.mp4' autoplay muted></video>
<video src='clip.mp4' autoplay muted loop playsinline></video>
```

Dynamic values such as `autoplay={{this.shouldAutoplay}}` or
`muted={{this.isMuted}}` are not flagged at lint time — the lint pass can't
know the runtime value, and false positives are considered worse than false
negatives here.

## Configuration

- `additionalElements` (`string[]`): extra tag names to check beyond the default
  `audio` / `video`. Useful if you render a custom element that also supports
  autoplay.

```js
module.exports = {
  rules: {
    'ember/template-no-autoplay': ['error', { additionalElements: ['my-media'] }],
  },
};
```

## References

- [WCAG 2.1 SC 1.4.2: Audio Control](https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html)
- [MDN: HTMLMediaElement.autoplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/autoplay)
- Adapted from [`html-validate`'s `no-autoplay`](https://html-validate.org/rules/no-autoplay.html) (MIT).
