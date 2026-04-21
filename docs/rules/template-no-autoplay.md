# ember/template-no-autoplay

<!-- end auto-generated rule header -->

This rule disallows the `autoplay` attribute on `<audio>` and `<video>` elements.

Autoplaying media is disruptive for users with cognitive or sensory sensitivities,
can interfere with screen readers, and consumes bandwidth without user consent.
WCAG Success Criterion 1.4.2 requires users to be able to pause, stop, or control
audio that plays automatically for more than three seconds.

## Examples

This rule **forbids** the following:

```hbs
<audio src='track.mp3' autoplay></audio>
<video src='clip.mp4' autoplay></video>
```

This rule **allows** the following:

```hbs
<audio src='track.mp3' controls></audio>
<video src='clip.mp4' controls></video>
<audio src='track.mp3' autoplay={{false}}></audio>
```

Dynamic values such as `autoplay={{this.shouldAutoplay}}` are not flagged at
lint time — the lint pass can't know the runtime value.

## Configuration

- `additionalElements` (`string[]`): extra tag names to check beyond the default
  `audio` / `video`. Useful if you render a custom element that also supports
  autoplay.

```js
{
  rules: {
    'ember/template-no-autoplay': [
      'error',
      { additionalElements: ['my-media'] },
    ],
  },
}
```

## References

- [WCAG 2.1 SC 1.4.2: Audio Control](https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html)
- [MDN: HTMLMediaElement.autoplay](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/autoplay)
- Adapted from [`html-validate`'s `no-autoplay`](https://html-validate.org/rules/no-autoplay.html) (MIT).
