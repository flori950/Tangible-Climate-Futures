import { TestBed } from '@angular/core/testing';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { commonTestProviders, mockAuthServiceProvider } from '../testing/test-helpers';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';

describe('AppComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SharedModule, RouterOutlet],
      declarations: [AppComponent],
      providers: [...commonTestProviders(), mockAuthServiceProvider()],
    });
  });

  it('renders the header and a router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-top-menu')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('switches the active language', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const translate = TestBed.inject(TranslateService);
    const use = vi.spyOn(translate, 'use');

    fixture.componentInstance.switchLanguage('en');

    expect(use).toHaveBeenCalledWith('en');
  });
});
