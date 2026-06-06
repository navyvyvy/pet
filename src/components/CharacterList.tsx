import {
  Ban,
  Edit3,
  Eye,
  EyeOff,
  MoveHorizontal,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { sourceTypeLabel, getCopy } from "../lib/i18n";
import { PET_SCALE_FACTOR } from "../lib/petSizing";
import type { AppSettings } from "../types/settings";
import type { PetDefinition } from "../types/pet";

type Props = {
  settings: AppSettings;
  onAdd: () => void;
  onEdit: (pet: PetDefinition) => void;
  onDelete: (petId: string) => void;
  onToggleVisible: (petId: string) => void;
  onToggleMovement: (petId: string) => void;
  onScale: (petId: string, factor: number) => void;
};

export default function CharacterList({
  settings,
  onAdd,
  onEdit,
  onDelete,
  onToggleVisible,
  onToggleMovement,
  onScale
}: Props) {
  const text = getCopy(settings.language);

  return (
    <section className="character-section">
      <div className="section-header">
        <h2>{text.list.characters}</h2>
        <button type="button" className="primary-button" onClick={onAdd}>
          <Plus size={18} />
          {text.list.add}
        </button>
      </div>

      {settings.pets.length === 0 ? (
        <div className="empty-state">
          <p>{text.list.empty}</p>
          <button type="button" className="primary-button" onClick={onAdd}>
            <Plus size={18} />
            {text.list.add}
          </button>
        </div>
      ) : (
        <div className="pet-list">
          {settings.pets.map((pet) => {
            const isVisible = pet.isVisible !== false;
            const canMove = pet.movementMode === "walk";

            return (
              <article className={isVisible ? "pet-row" : "pet-row hidden"} key={pet.id}>
                <div className="pet-row-main">
                  <strong>{pet.name}</strong>
                  <span>
                    {sourceTypeLabel(settings.language, pet.sourceType)} · {pet.frameCount}{" "}
                    {text.list.frameUnit} ·{" "}
                    {text.list.instanceCount(pet.instanceCount || 1)} ·{" "}
                    {canMove ? text.common.move : text.common.still}
                  </span>
                </div>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onToggleVisible(pet.id)}
                    title={isVisible ? text.common.hide : text.common.show}
                    aria-label={isVisible ? text.common.hide : text.common.show}
                  >
                    {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onToggleMovement(pet.id)}
                    title={canMove ? text.menu.petMovementOff : text.menu.petMovementOn}
                    aria-label={canMove ? text.menu.petMovementOff : text.menu.petMovementOn}
                  >
                    {canMove ? <MoveHorizontal size={18} /> : <Ban size={18} />}
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onScale(pet.id, 1 / PET_SCALE_FACTOR)}
                    title={text.common.zoomOut}
                    aria-label={text.common.zoomOut}
                  >
                    <ZoomOut size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onScale(pet.id, PET_SCALE_FACTOR)}
                    title={text.common.zoomIn}
                    aria-label={text.common.zoomIn}
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onEdit(pet)}
                    title={text.common.edit}
                    aria-label={text.common.edit}
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => onDelete(pet.id)}
                    title={text.common.delete}
                    aria-label={text.common.delete}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
