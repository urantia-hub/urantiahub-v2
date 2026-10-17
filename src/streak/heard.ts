// Which paragraph the voice played to near its end. A skip forward hears nothing; any speed counts,
// because the time is the time in the file.

const HEARD_SHARE = 0.8;
const PARAGRAPH = /^\d{1,3}:\d{1,3}\.\d{1,3}$/;

export function createHearing(durationOf: (ref: string) => number) {
  let current: string | null = null;
  let furthest = 0;
  return {
    // The item that sounds now and the time in it. Answers the paragraph that was heard as the voice left it.
    observe(item: string | null, time: number): string | null {
      const ref = item && PARAGRAPH.test(item) ? item : null;
      if (ref === current) {
        furthest = Math.max(furthest, time);
        return null;
      }
      const left = current;
      const duration = left ? durationOf(left) : 0;
      const heard = left && duration > 0 && furthest >= duration * HEARD_SHARE ? left : null;
      current = ref;
      furthest = ref ? time : 0;
      return heard;
    },
  };
}
