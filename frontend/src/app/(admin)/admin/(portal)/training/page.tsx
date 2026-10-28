import {redirect} from 'next/navigation';
import {TRAINING_ADMIN_HOME} from '@/features/training/types/training.types';

export default function AdminTrainingRoutePage() {
    redirect(TRAINING_ADMIN_HOME);
}
