import {afterEach,describe,expect,it,vi} from 'vitest';
import {withTimeout} from '../src/request';

afterEach(()=>vi.useRealTimers());
describe('portable request cancellation',()=>{
  it('keeps the deadline active while consuming the response body',async()=>{
    vi.useFakeTimers();
    const result=withTimeout(signal=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason));
    }),100);
    const checked=expect(result).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(100);
    await checked;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('propagates cancellation and cleans up the timer',async()=>{
    vi.useFakeTimers();
    const parent=new AbortController();
    const result=withTimeout(signal=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason));
    }),5000,parent.signal);
    const checked=expect(result).rejects.toMatchObject({name:'AbortError'});
    parent.abort();await checked;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not start an already-cancelled operation',async()=>{
    const parent=new AbortController();parent.abort();const operation=vi.fn();
    await expect(withTimeout(operation,100,parent.signal)).rejects.toMatchObject({name:'AbortError'});
    expect(operation).not.toHaveBeenCalled();
  });
  it('clears its deadline on success',async()=>{
    vi.useFakeTimers();
    await expect(withTimeout(async()=>42,100)).resolves.toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });
});
