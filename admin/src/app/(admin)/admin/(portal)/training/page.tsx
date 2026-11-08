import {redirect} from 'next/navigation';
import {TRAINING_ADMIN_HOME} from '@/types/training/training.types';

export default function AdminTrainingRoutePage() {
    redirect(TRAINING_ADMIN_HOME);
}
