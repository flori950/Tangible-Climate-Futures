import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Single-file picker with drag & drop.
 *
 * Replaces the PrimeNG `p-fileUpload` widget that was used before (PrimeNG >= 22
 * is no longer MIT licensed and requires a license key). The component never
 * uploads anything itself; it only reports the chosen file to its parent.
 *
 * Projected content is shown as hint inside the drop area while no file is selected.
 */
@Component({
  selector: 'app-file-drop',
  templateUrl: './file-drop.component.html',
  styleUrls: ['./file-drop.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FileDropComponent {
  /** Same syntax as the `accept` attribute of `<input type="file">`, e.g. ".csv,.txt". Empty = any file. */
  @Input() accept = '';

  /** Label of the "choose file" button. */
  @Input() chooseLabel = 'Choose';

  /** Currently selected file (owned by the parent), shown instead of the hint. */
  @Input() file?: File;

  /** Emits the chosen or dropped file (only files matching `accept`). */
  @Output() fileSelected = new EventEmitter<File>();

  /** Emits when the user removes the selected file. */
  @Output() fileCleared = new EventEmitter<void>();

  isDragOver = false;

  /** Name of the last dropped file that did not match `accept`. */
  rejectedFileName?: string;

  onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.select(file);
    // allow selecting the same file again
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.select(file);
  }

  clear() {
    this.rejectedFileName = undefined;
    this.fileCleared.emit();
  }

  /** Checks a file against the `accept` list (extensions, exact MIME types or `type/*`). */
  isAccepted(file: File): boolean {
    const accepted = this.accept
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
    if (accepted.length === 0) return true;

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();
    return accepted.some((entry) => {
      if (entry.startsWith('.')) return name.endsWith(entry);
      if (entry.endsWith('/*')) return type.startsWith(entry.slice(0, -1));
      return type === entry;
    });
  }

  private select(file: File) {
    if (!this.isAccepted(file)) {
      this.rejectedFileName = file.name;
      return;
    }
    this.rejectedFileName = undefined;
    this.fileSelected.emit(file);
  }
}
