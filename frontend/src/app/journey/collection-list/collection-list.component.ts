import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CollectionData } from '../services/journey.service';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-collection-list',
    templateUrl: './collection-list.component.html',
    styleUrls: ['./collection-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class CollectionListComponent {
  @Input({ required: true }) collectionsData!: Observable<CollectionData>[];
}
