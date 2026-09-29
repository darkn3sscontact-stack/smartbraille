/** Cancellation and whole-response deadlines, including browsers without AbortSignal.any. */
export async function withTimeout<T>(
  operation:(signal:AbortSignal)=>Promise<T>,
  milliseconds:number,
  parent?:AbortSignal,
):Promise<T> {
  const controller=new AbortController();
  const cancel=()=>controller.abort(parent?.reason);
  if(parent?.aborted)cancel();
  else parent?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('Request timed out','TimeoutError')),milliseconds);
  try {
    if(controller.signal.aborted)throw controller.signal.reason;
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort',cancel);
  }
}
