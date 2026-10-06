export function createStore(initialState){
  let state=initialState;
  const listeners=new Set();
  return {
    getState(){return state;},
    setState(next){
      state=typeof next==='function'?next(state):next;
      for(const listener of listeners)listener(state);
      return state;
    },
    mutate(mutator){
      mutator(state);
      for(const listener of listeners)listener(state);
      return state;
    },
    subscribe(listener){
      listeners.add(listener);
      return ()=>listeners.delete(listener);
    }
  };
}
