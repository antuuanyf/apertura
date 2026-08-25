import {
    ApplicationRef,
    EnvironmentInjector,
    Injectable,
    Type,
    createComponent,
    inject,
} from '@angular/core'
import { modal, type ModalOpenOptions } from 'apertura'

@Injectable({ providedIn: 'root' })
export class Modal {
    private readonly appRef = inject(ApplicationRef)
    private readonly injector = inject(EnvironmentInjector)

    open<T = unknown>(options: ModalOpenOptions = {}) {
        return modal.open<T>(options)
    }

    openComponent<T, R = unknown>(
        component: Type<T>,
        options: ModalOpenOptions = {},
    ) {
        return this.open<R>({
            ...options,
            confirmLabel: null,
            cancelLabel: null,
            render: (body, { close }) => {
                const ref = createComponent(component, {
                    environmentInjector: this.injector,
                    hostElement: body,
                })
                this.appRef.attachView(ref.hostView)
                ref.setInput('close', close)
                ref.changeDetectorRef.detectChanges()
                return () => {
                    this.appRef.detachView(ref.hostView)
                    ref.destroy()
                }
            },
        })
    }
}
