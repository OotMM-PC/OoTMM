import type { Cosmetics, PcSeedColorKey, PcSeedCosmeticsFile } from '@ootmm/generator';

import { useState } from 'react';
import { COLORS, COSMETICS, editPcSeedCosmetics, readPcSeedCosmetics } from '@ootmm/generator';
import { CheckboxField } from './ui/CheckboxField';
import { Button, Card, FileSelectField, SelectField } from './ui';

import ootmmLogo from '../../assets/logo.png';
import { useStore } from '../store';

const COLOR_OPTIONS: { label: string, value: string }[] = [{ value: 'default', label: 'Default' }, { value: 'auto', label: 'Auto' }, { value: 'random', label: 'Random' }, ...Object.entries(COLORS).map(([key, x]) => ({ label: x.name, value: key }))];
const CUSTOM_COLOR = 'custom';

function CosmeticTooltips({ cosmetic }: { cosmetic: string }) {
  const data = COSMETICS.find(x => x.key === cosmetic)!;
  const description = (data as any).description;

  let defaultValue = '';

  if (!description) {
    return null;
  }

  switch (data.type) {
    case 'boolean':
      defaultValue = data.default ? 'true' : 'false';
      break;
    case 'color':
      defaultValue = 'Default';
      break;
  }

  return <>
    <pre className="whitespace-pre-line flex flex-col gap-4">
      {description.split('<br>').join('\n')}
      <span>Default: <strong>{defaultValue}</strong></span>
    </pre>
  </>;
}

type CosmeticProps = {
  cosmetic: keyof Cosmetics;
  cosmetics: Cosmetics;
  onChange: (key: keyof Cosmetics, value: any) => void;
  customColor?: string;
};

function Cosmetic({ cosmetic, cosmetics, onChange, customColor }: CosmeticProps) {
  const data = COSMETICS.find(x => x.key === cosmetic)!;

  switch (data.type) {
    case 'color':
      const selectedColorKey = customColor ? CUSTOM_COLOR : cosmetics[cosmetic] as string;
      const colorValue = customColor
        ? (/^#[0-9a-f]{6}$/i.test(customColor) ? parseInt(customColor.slice(1), 16) : null)
        : selectedColorKey && selectedColorKey !== 'default' && selectedColorKey !== 'auto' && selectedColorKey !== 'random'
          ? COLORS[selectedColorKey as keyof typeof COLORS]?.value
          : null;
      const options = customColor ? [{ value: CUSTOM_COLOR, label: `Custom (${customColor})` }, ...COLOR_OPTIONS] : COLOR_OPTIONS;

      return (
        <SelectField
          key={cosmetic}
          value={selectedColorKey}
          label={data.name}
          color={colorValue}
          options={options}
          tooltip={(data as any).description && <CosmeticTooltips cosmetic={cosmetic} />}
          onSelect={v => onChange(cosmetic, v)}
        />
      );
    case 'file':
      return (
        <FileSelectField
          imageSrc={ootmmLogo}
          label={data.name}
          accept={`.${data.ext}`}
          file={cosmetics[cosmetic] as File | null}
          onInput={(f) => onChange(cosmetic, f)}
        />
      );
    case 'boolean':
      return (
        <CheckboxField
          label={data.name}
          checked={!!(cosmetics[cosmetic])}
          tooltip={(data as any).description && <CosmeticTooltips cosmetic={cosmetic} />}
          onChange={(v) => onChange(cosmetic, v)}
        />
      );
    default:
      return null;
  }
}

function visibleCosmetics(settings: unknown, files: boolean) {
  return COSMETICS.filter(c => {
    const cond = (c as any).cond;
    return (c.type === 'file') === files && (!cond || cond(settings));
  });
}

async function saveSeedFile(name: string, text: string): Promise<'saved' | 'downloaded' | null> {
  const picker = (window as any).showSaveFilePicker;
  if (picker) {
    let handle;
    try {
      handle = await picker({ suggestedName: name, types: [{ description: 'OoTMM PC seed', accept: { 'application/json': ['.json'] } }] });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return null;
      throw e;
    }
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    return 'saved';
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
  return 'downloaded';
}

type LoadedSeed = PcSeedCosmeticsFile & { fileName: string, text: string };

function PcSeedCosmeticsEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [seed, setSeed] = useState<LoadedSeed | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async (f: File | null) => {
    setFile(f);
    setStatus(null);
    if (!f) {
      setSeed(null);
      return;
    }
    try {
      const text = await f.text();
      setSeed({ ...readPcSeedCosmetics(text), fileName: f.name, text });
    } catch (e) {
      setSeed(null);
      setStatus(`Could not read ${f.name}: ${(e as Error).message}`);
    }
  };

  const change = (key: keyof Cosmetics, value: any) => {
    if (!seed) return;
    const customColors = { ...seed.customColors };
    if (value !== CUSTOM_COLOR) {
      delete customColors[key as PcSeedColorKey];
    }
    setSeed({ ...seed, customColors, cosmetics: value === CUSTOM_COLOR ? seed.cosmetics : { ...seed.cosmetics, [key]: value } });
    setStatus(null);
  };

  const save = async () => {
    if (!seed) return;
    try {
      const text = await editPcSeedCosmetics(seed.text, seed.cosmetics, seed.customColors);
      const result = await saveSeedFile(seed.fileName, text);
      if (!result) return;
      setSeed({ ...readPcSeedCosmetics(text), fileName: seed.fileName, text });
      setStatus(result === 'saved' ? `Saved ${seed.fileName}.` : `Downloaded ${seed.fileName}. Point the launcher at the downloaded file.`);
    } catch (e) {
      setStatus(`Could not save: ${(e as Error).message}`);
    }
  };

  return (
    <Card className="mt-16 p-8 flex flex-col gap-4">
      <div>
        <div className="font-bold text-xl">Edit a PC seed's cosmetics</div>
        <div className="text-sm text-gray-500">Load a player's .ootmm.json to change its colours and options. Nothing else in the seed changes.</div>
      </div>
      <div className="flex gap-8 items-center">
        <FileSelectField imageSrc={ootmmLogo} label="PC seed" accept=".json" file={file} onInput={load}/>
        {seed && (
          <div className="flex flex-col gap-2">
            <span className="font-semibold">{seed.seedName}</span>
            <span>Player {seed.playerId} of {seed.playerCount}</span>
            <Button variant="submit" onClick={save}>Save edited seed</Button>
          </div>
        )}
      </div>
      {status && <div className="text-sm">{status}</div>}
      {seed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCosmetics(seed.settings, false).map(c => (
            <Cosmetic key={c.key} cosmetic={c.key} cosmetics={seed.cosmetics} onChange={change} customColor={seed.customColors[c.key as PcSeedColorKey]}/>
          ))}
        </div>
      )}
    </Card>
  );
}

export function CosmeticsEditor() {
  const settings = useStore(state => state.settings);
  const cosmetics = useStore(state => state.cosmetics);
  const playerCosmetics = useStore(state => state.playerCosmetics);
  const setCosmetic = useStore(state => state.setCosmetic);
  const setPlayerCosmetic = useStore(state => state.setPlayerCosmetic);
  const resetPlayerCosmetics = useStore(state => state.resetPlayerCosmetics);
  const [target, setTarget] = useState<number | null>(null);

  const perPlayer = settings.mode === 'multi' && settings.teams === 1;
  const player = perPlayer && target !== null && target < settings.players ? target : null;
  const own = player !== null ? playerCosmetics[player] ?? null : null;
  const shown = own ?? cosmetics;
  const change = (key: keyof Cosmetics, value: any) => player === null ? setCosmetic(key, value) : setPlayerCosmetic(player, key, value);
  const unusedOwn = !perPlayer && playerCosmetics.some(c => c);
  const teamsNote = settings.mode === 'multi' && settings.teams > 1;
  const targetOptions = [{ value: -1, label: 'All players' }, ...Array.from({ length: settings.players }, (_, i) => ({ value: i, label: `Player ${i + 1}${playerCosmetics[i] ? ' (own cosmetics)' : ''}` }))];

  return <main className="p-8">
    {perPlayer && (
      <div className="mb-8 flex flex-col gap-2">
        <div className="flex gap-4 items-end">
          <div className="w-80">
            <SelectField label="Cosmetics for" value={player ?? -1} options={targetOptions} onSelect={v => setTarget(v === -1 ? null : v as number)}/>
          </div>
          {own && player !== null && <Button variant="danger" onClick={() => resetPlayerCosmetics(player)}>Reset to shared</Button>}
        </div>
        <div className="text-sm text-gray-500">
          {player === null && 'These apply to every player without their own set. Fixed colours are the same for everyone; Random colours are rolled separately for each player.'}
          {player !== null && !own && `Player ${player + 1} follows All players, but any Random colour gets its own roll for them. Change anything here to give Player ${player + 1} their own set.`}
          {player !== null && own && `Player ${player + 1} has their own cosmetics and no longer follows All players.`}
        </div>
      </div>
    )}
    {(teamsNote || unusedOwn) && (
      <div className="mb-8 flex flex-col gap-2 text-sm text-gray-500">
        {teamsNote && <div>Random colours are rolled separately for each player number; the same player number on every team shares one roll.</div>}
        {unusedOwn && <div>Per-player cosmetics are saved but only apply to multiworld seeds with one team.</div>}
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleCosmetics(settings, false).map(c => <Cosmetic key={c.key} cosmetic={c.key} cosmetics={shown} onChange={change}/>)}
    </div>
    {player === null && (
      <div className="flex gap-16 mt-16 justify-center">
        {visibleCosmetics(settings, true).map(c => <Cosmetic key={c.key} cosmetic={c.key} cosmetics={cosmetics} onChange={setCosmetic}/>)}
      </div>
    )}
    <PcSeedCosmeticsEditor/>
  </main>;
}
