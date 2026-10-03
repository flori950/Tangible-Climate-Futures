import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { commonTestProviders, mockAuthServiceProvider } from '../../../testing/test-helpers';
import { AuthService } from '../../auth/services/auth.service';
import { SharedModule } from '../shared.module';
import { TopMenuComponent } from './top-menu.component';

describe('TopMenuComponent', () => {
  let component: TopMenuComponent;
  let fixture: ComponentFixture<TopMenuComponent>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SharedModule],
      providers: [...commonTestProviders(), mockAuthServiceProvider('user@example.org')],
    });
    fixture = TestBed.createComponent(TopMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults to German and shows the logged-in user', () => {
    expect(component.currentLanguage).toBe('de');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('user@example.org');
  });

  it('switches and remembers the language', () => {
    const emitted: string[] = [];
    component.languageChanged.subscribe((lang) => emitted.push(lang));
    const use = vi.spyOn(TestBed.inject(TranslateService), 'use');

    component.switchLanguage('en');

    expect(use).toHaveBeenCalledWith('en');
    expect(localStorage.getItem('language')).toBe('en');
    expect(emitted).toEqual(['en']);
  });

  it('logs out via the AuthService', () => {
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout');
    component.logout();
    expect(logout).toHaveBeenCalled();
  });
});
