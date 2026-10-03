import { ComponentFixture, TestBed } from '@angular/core/testing';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { SharedModule } from '../shared.module';
import { FileDropComponent } from './file-drop.component';

function dragEvent(type: string, files: File[] = []): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: { files } });
  return event;
}

describe('FileDropComponent', () => {
  let component: FileDropComponent;
  let fixture: ComponentFixture<FileDropComponent>;
  let selected: File[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(FileDropComponent);
    component = fixture.componentInstance;
    selected = [];
    component.fileSelected.subscribe((file) => selected.push(file));
    fixture.detectChanges();
  });

  it.each([
    ['', 'any.bin', '', true],
    ['.csv', 'data.CSV', 'text/csv', true],
    ['.csv', 'data.txt', 'text/plain', false],
    ['.json, .txt', 'notes.txt', 'text/plain', true],
    ['image/*', 'photo.jpg', 'image/jpeg', true],
    ['text/csv', 'x', 'text/plain', false],
  ])('accept "%s" for %s (%s) -> %s', (accept, name, type, expected) => {
    component.accept = accept;
    expect(component.isAccepted(new File(['x'], name, { type }))).toBe(expected);
  });

  it('emits a dropped file that matches the accept list', () => {
    component.accept = '.csv';
    const file = new File(['a'], 'a.csv');
    const drop = dragEvent('drop', [file]);
    const element = (fixture.nativeElement as HTMLElement).querySelector('.file-drop')!;

    element.dispatchEvent(drop);

    expect(selected).toEqual([file]);
    expect(drop.defaultPrevented).toBe(true);
  });

  it('rejects dropped files of the wrong type and shows a message', () => {
    component.accept = '.csv';
    component.onDrop(dragEvent('drop', [new File(['a'], 'a.pdf')]));
    fixture.detectChanges();

    expect(selected).toEqual([]);
    expect(component.rejectedFileName).toBe('a.pdf');
    expect((fixture.nativeElement as HTMLElement).querySelector('.rejected')).not.toBeNull();
  });

  it('emits the file chosen via the native file dialog', () => {
    const file = new File(['a'], 'a.json');
    const input = (fixture.nativeElement as HTMLElement).querySelector(
      'input[type=file]',
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    input.dispatchEvent(new Event('change'));

    expect(selected).toEqual([file]);
  });

  it('highlights the drop area while dragging', () => {
    component.onDragOver(dragEvent('dragover'));
    expect(component.isDragOver).toBe(true);
    component.onDragLeave(dragEvent('dragleave'));
    expect(component.isDragOver).toBe(false);
  });

  it('shows the selected file name and lets the user remove it', () => {
    const cleared = vi.fn();
    component.fileCleared.subscribe(cleared);
    fixture.componentRef.setInput('file', new File(['a'], 'chosen.csv'));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.file-name')?.textContent).toContain('chosen.csv');
    element.querySelector<HTMLButtonElement>('.selected-file button')!.click();
    expect(cleared).toHaveBeenCalledOnce();
  });
});
