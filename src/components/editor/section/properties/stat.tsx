import {
  ChangeEventHandler,
  FormEventHandler,
  MouseEventHandler,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { FileContext } from "App";
import { calculateExp } from "util/game";
import { Bitburner } from "bitburner";

interface Props extends PropsWithChildren<{}> {
  property: Bitburner.PlayerStat;
  onSubmit(key: string, value: any): void;
}

export default observer(function StatSection({ property, onSubmit }: Props) {
  const { player } = useContext(FileContext);

  // Handle both old format (player.data.hacking) and new format (player.data.skills.hacking)
  const getStatValue = (data?: any) => {
    if (!data) data = player.data;
    const skillsData = (data as any).skills;
    return skillsData ? skillsData[property] : data[property];
  };

  const getExpMult = () => {
    const multsData = (player.data as any).mults;
    return multsData ? multsData[`${property}_exp`] : (player.data as any)[`${property}_exp_mult`];
  };

  const currentStatValue = getStatValue();
  const originalStatValue = player.originalData ? getStatValue(player.originalData) : undefined;
  const hasChanged = originalStatValue !== undefined && currentStatValue !== originalStatValue;

  const [value, setValue] = useState(`${currentStatValue}`);

  const [editing, setEditing] = useState(false);

  // Sync local state when the stat value changes (e.g., when data is reverted)
  useEffect(() => {
    setValue(`${currentStatValue}`);
  }, [currentStatValue]);

  const handleRevert = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (originalStatValue === undefined) return;

    const mult = property === "intelligence" ? 1 : getExpMult() || 1;
    const skillsData = (player.data as any).skills;
    const expData = (player.data as any).exp;

    if (skillsData && expData) {
      // New format (2.8.1+)
      onSubmit('skills', { ...skillsData, [property]: originalStatValue });
      onSubmit('exp', { ...expData, [property]: calculateExp(originalStatValue, mult) });
    } else {
      // Old format
      onSubmit(`${property}_exp`, calculateExp(originalStatValue, mult));
      onSubmit(`${property}`, originalStatValue);
    }
  }, [originalStatValue, property, onSubmit, player.data]);

  const onChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setValue(event.currentTarget.value);
  }, []);

  const onClose = useCallback<MouseEventHandler<HTMLDivElement> & FormEventHandler>(
    (event) => {
      const desiredLevel = Math.min(Number.MAX_SAFE_INTEGER, Number(value));
      let mult = property === "intelligence" ? 1 : getExpMult() || 1;

      // @TODO: Handle augmentations

      // For new format, update both skills and exp objects
      const skillsData = (player.data as any).skills;
      const expData = (player.data as any).exp;

      if (skillsData && expData) {
        // New format (2.8.1+)
        onSubmit('skills', { ...skillsData, [property]: desiredLevel });
        onSubmit('exp', { ...expData, [property]: calculateExp(desiredLevel, mult) });
      } else {
        // Old format
        onSubmit(`${property}_exp`, calculateExp(desiredLevel, mult));
        onSubmit(`${property}`, desiredLevel);
      }

      setEditing(false);
      event.preventDefault();
    },
    [property, onSubmit, value, player.data]
  );

  return (
    <>
      <form
        className={clsx(
          "w-64 rounded border shadow",
          hasChanged ? "border-yellow-500 shadow-yellow-700" : "border-gray-700 shadow-green-700"
        )}
        data-id="stat-section"
        data-property={property}
        onSubmit={onClose}
      >
        <label
          className={clsx(
            "h-full w-full relative inline-flex flex-col p-2 rounded hover:bg-gray-800 transition-colors duration-200 ease-in-out focus-within:bg-gray-800",
            editing && "z-20"
          )}
          onClick={!editing ? () => setEditing(true) : undefined}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xl font-bold text-gray-100 capitalize">{property}</span>
            {hasChanged && (
              <button
                type="button"
                onClick={handleRevert}
                className="ml-2 px-2 py-0.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white"
                title="Reset to original value"
              >
                Reset
              </button>
            )}
          </div>
          {!editing && <span className="text-lg overflow-hidden overflow-ellipsis">{getStatValue()}</span>}
          {editing && (
            <>
              <div>
                <span>Level: </span>
                <input
                  className="bg-transparent px-2 py-1 rounded border-gray-800 hover:bg-gray-900 focus:bg-gray-900 outline-none"
                  value={value}
                  type="number"
                  onChange={onChange}
                />
              </div>
              <small className="mt-1 text-xs italic text-slate-500 px-2">
                Level calculation does not factor augmentations, so actual in-game levels may vary
              </small>
            </>
          )}
        </label>
      </form>
      <div
        className={clsx(
          "z-10 absolute inset-0 bg-gray-900  transition-opacity duration-200 ease-in-out",
          editing ? "opacity-50" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
    </>
  );
});
