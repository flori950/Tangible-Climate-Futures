import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  it('opens a snack bar with an "Okay" action for 3 seconds', () => {
    const open = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: { open } }],
    });

    TestBed.inject(NotificationService).showInfo('Saved');

    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith('Saved', 'Okay', { duration: 3000 });
  });
});
