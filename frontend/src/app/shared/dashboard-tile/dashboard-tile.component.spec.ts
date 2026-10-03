import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { SharedModule } from '../shared.module';
import { DashboardTileComponent } from './dashboard-tile.component';

describe('DashboardTileComponent', () => {
  let fixture: ComponentFixture<DashboardTileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
    fixture = TestBed.createComponent(DashboardTileComponent);
    fixture.componentRef.setInput('title', 'Upload');
    fixture.componentRef.setInput('iconName', 'upload');
    fixture.componentRef.setInput('url', 'upload-data');
    fixture.detectChanges();
  });

  it('renders its title', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Upload');
  });

  it('navigates to its url when clicked', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.card')!.click();
    expect(navigate).toHaveBeenCalledWith(['upload-data']);
  });
});
