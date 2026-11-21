import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button, Card, Input, Select } from './ui';
import { FaXmark } from 'react-icons/fa6';
import { useStore } from '../store';

export function JunkLocations() {
  const junkLocations = useStore(state => state.settings.junkLocations);
  const patchSettings = useStore(state => state.patchSettings);
  const locations = useStore(state => state.locations);
  const [junkLocationsCache, setJunkLocationsCache] = useState(junkLocations);
  const [filter, setFilter] = useState('');
  const options = useMemo(() => locations.filter(x => !junkLocationsCache.includes(x)).sort().map(loc => ({ value: loc, label: loc })), [locations, junkLocationsCache]);
  const junkedShuffled = useMemo(() => { const set = new Set(locations); return junkLocationsCache.filter(x => set.has(x)).length; }, [locations, junkLocationsCache]);
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return [...junkLocationsCache].sort().filter(x => x.toLowerCase().includes(needle));
  }, [junkLocationsCache, filter]);

  useEffect(() => {
    setJunkLocationsCache(junkLocations);
  }, [junkLocations]);

  const add = useCallback((loc: string) => {
    setJunkLocationsCache(prev => [...prev, loc]);
    patchSettings({ junkLocations: { add: [loc] } });
  }, []);

  const addMany = useCallback((locs: string[]) => {
    setJunkLocationsCache(prev => [...prev, ...locs]);
    patchSettings({ junkLocations: { add: locs } });
  }, []);

  const remove = useCallback((loc: string) => {
    setJunkLocationsCache(prev => prev.filter(x => x !== loc));
    patchSettings({ junkLocations: { remove: [loc] } });
  }, []);

  const removeShown = useCallback(() => {
    const removed = new Set(shown);
    setJunkLocationsCache(prev => prev.filter(x => !removed.has(x)));
    patchSettings({ junkLocations: { remove: shown } });
    setFilter('');
  }, [shown]);

  const clear = useCallback(() => {
    setJunkLocationsCache([]);
    patchSettings({ junkLocations: { set: [] } });
    setFilter('');
  }, []);

  return (
    <main className="h-full flex flex-col gap-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Select
            searcheable
            stayOpen
            placeholder="Search locations to junk"
            value={null}
            options={options}
            onSelect={add}
            selectMany={{ label: (count) => `Junk all ${count} matching locations`, onSelect: addMany }}
          />
        </div>
        <Button variant="danger" onClick={clear}>Clear All</Button>
      </div>
      {locations.length > 0 && (
        <div className="text-sm text-gray-500">{junkedShuffled} of {locations.length} shuffled locations junked</div>
      )}
      {junkLocationsCache.length > 0 && (
        <div className="flex gap-4">
          <Input className="flex-1" type="text" placeholder="Filter junked locations" value={filter} onChange={setFilter}/>
          <Button variant="danger" disabled={!filter.trim() || shown.length === 0} onClick={removeShown}>{filter.trim() ? `Remove ${shown.length} shown` : 'Remove matches'}</Button>
        </div>
      )}
      <Card className="flex-[1_1_0] overflow-y-auto">
        {junkLocationsCache.length === 0 && (
          <div className="h-full flex justify-center items-center">
            <span className="text-gray-500 text-3xl">No Junk Locations</span>
          </div>
        )}
        {junkLocationsCache.length > 0 && shown.length === 0 && (
          <div className="h-full flex justify-center items-center">
            <span className="text-gray-500 text-xl">No junked locations match the filter</span>
          </div>
        )}
        {shown.map((loc) => (
          <div key={loc} className="flex gap-1 items-center">
            <span className="hover:text-gray-500 cursor-pointer" onClick={() => remove(loc)}><FaXmark/></span>
            <span>{loc}</span>
          </div>
        ))}
      </Card>
    </main>
  );
}
