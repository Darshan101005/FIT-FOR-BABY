export interface QuestionOption {
  value: string;
  label: string;
  labelTamil?: string;
}

export interface Question {
  id: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'radio' | 'date' | 'scale';
  question: string;
  questionTamil?: string;
  placeholder?: string;
  options?: QuestionOption[];
  min?: number;
  max?: number;
  unit?: string;
  required: boolean;
  genderSpecific?: 'male' | 'female';
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface QuestionSection {
  id: string;
  title: string;
  titleTamil?: string;
  description: string;
  descriptionTamil?: string;
  icon: string;
  questions: Question[];
}

export const questionnaireData: QuestionSection[] = [
  {
    id: 'demographics',
    title: 'Personal Information',
    titleTamil: 'தனிப்பட்ட தகவல்',
    description: 'Tell us about yourself',
    descriptionTamil: 'உங்களைப் பற்றி சொல்லுங்கள்',
    icon: 'person-outline',
    questions: [
      {
        id: 'full_name',
        type: 'text',
        question: 'What is your full name?',
        questionTamil: 'உங்கள் முழு பெயர் என்ன?',
        placeholder: 'Enter your full name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        id: 'age',
        type: 'number',
        question: 'What is your age?',
        questionTamil: 'உங்கள் வயது என்ன?',
        placeholder: 'Enter your age',
        min: 18,
        max: 60,
        unit: 'years',
        required: true
      },
      {
        id: 'date_of_birth',
        type: 'date',
        question: 'What is your date of birth?',
        questionTamil: 'உங்கள் பிறந்த தேதி என்ன?',
        required: true
      },
      {
        id: 'education',
        type: 'select',
        question: 'What is your highest education level?',
        questionTamil: 'உங்கள் உயர்ந்த கல்வி நிலை என்ன?',
        options: [
          { value: 'primary', label: 'Primary School', labelTamil: 'ஆரம்பப் பள்ளி' },
          { value: 'secondary', label: 'Secondary School', labelTamil: 'மேல்நிலைப் பள்ளி' },
          { value: 'higher_secondary', label: 'Higher Secondary', labelTamil: 'மேல்நிலைப் படிப்பு' },
          { value: 'diploma', label: 'Diploma', labelTamil: 'டிப்ளோமா' },
          { value: 'bachelors', label: "Bachelor's Degree", labelTamil: 'இளங்கலை பட்டம்' },
          { value: 'masters', label: "Master's Degree", labelTamil: 'முதுகலை பட்டம்' },
          { value: 'doctorate', label: 'Doctorate', labelTamil: 'முனைவர் பட்டம்' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'occupation',
        type: 'select',
        question: 'What is your occupation?',
        questionTamil: 'உங்கள் தொழில் என்ன?',
        options: [
          { value: 'employed', label: 'Employed', labelTamil: 'வேலையில் உள்ளவர்' },
          { value: 'self_employed', label: 'Self-Employed', labelTamil: 'சுயதொழில்' },
          { value: 'homemaker', label: 'Homemaker', labelTamil: 'இல்லத்தரசி' },
          { value: 'student', label: 'Student', labelTamil: 'மாணவர்' },
          { value: 'retired', label: 'Retired', labelTamil: 'ஓய்வு பெற்றவர்' },
          { value: 'unemployed', label: 'Unemployed', labelTamil: 'வேலையில்லாதவர்' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'income_level',
        type: 'select',
        question: 'What is your monthly household income?',
        questionTamil: 'உங்கள் மாத குடும்ப வருமானம் என்ன?',
        options: [
          { value: 'below_10000', label: 'Below ₹10,000', labelTamil: '₹10,000க்கு கீழ்' },
          { value: '10000_25000', label: '₹10,000 - ₹25,000', labelTamil: '₹10,000 - ₹25,000' },
          { value: '25000_50000', label: '₹25,000 - ₹50,000', labelTamil: '₹25,000 - ₹50,000' },
          { value: '50000_100000', label: '₹50,000 - ₹1,00,000', labelTamil: '₹50,000 - ₹1,00,000' },
          { value: 'above_100000', label: 'Above ₹1,00,000', labelTamil: '₹1,00,000க்கு மேல்' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say', labelTamil: 'சொல்ல விரும்பவில்லை' }
        ],
        required: true
      },
      {
        id: 'address_city',
        type: 'text',
        question: 'Which city do you live in?',
        questionTamil: 'நீங்கள் எந்த நகரத்தில் வசிக்கிறீர்கள்?',
        placeholder: 'Enter your city',
        required: true
      },
      {
        id: 'address_state',
        type: 'text',
        question: 'Which state do you live in?',
        questionTamil: 'நீங்கள் எந்த மாநிலத்தில் வசிக்கிறீர்கள்?',
        placeholder: 'Enter your state',
        required: true
      }
    ]
  },
  {
    id: 'medical_history',
    title: 'Medical History',
    titleTamil: 'மருத்துவ வரலாறு',
    description: 'Help us understand your medical background',
    descriptionTamil: 'உங்கள் மருத்துவ பின்னணியை புரிந்துகொள்ள உதவுங்கள்',
    icon: 'medical-outline',
    questions: [
      {
        id: 'infertility_type',
        type: 'radio',
        question: 'What type of infertility have you been diagnosed with?',
        questionTamil: 'உங்களுக்கு எந்த வகை மலட்டுத்தன்மை கண்டறியப்பட்டது?',
        options: [
          { value: 'primary', label: 'Primary (Never conceived)', labelTamil: 'முதன்மை (கருத்தரிக்கவில்லை)' },
          { value: 'secondary', label: 'Secondary (Previously conceived)', labelTamil: 'இரண்டாம் நிலை (முன்பு கருத்தரித்தது)' }
        ],
        required: true
      },
      {
        id: 'infertility_duration',
        type: 'select',
        question: 'How long have you been trying to conceive?',
        questionTamil: 'எவ்வளவு காலமாக கருத்தரிக்க முயற்சிக்கிறீர்கள்?',
        options: [
          { value: 'less_than_1_year', label: 'Less than 1 year', labelTamil: '1 வருடத்திற்கு குறைவாக' },
          { value: '1_2_years', label: '1-2 years', labelTamil: '1-2 வருடங்கள்' },
          { value: '2_5_years', label: '2-5 years', labelTamil: '2-5 வருடங்கள்' },
          { value: '5_10_years', label: '5-10 years', labelTamil: '5-10 வருடங்கள்' },
          { value: 'more_than_10_years', label: 'More than 10 years', labelTamil: '10 வருடங்களுக்கு மேல்' }
        ],
        required: true
      },
      {
        id: 'previous_treatments',
        type: 'multiselect',
        question: 'What fertility treatments have you undergone? (Select all that apply)',
        questionTamil: 'நீங்கள் என்ன கருவுறுதல் சிகிச்சைகள் பெற்றுள்ளீர்கள்? (பொருந்துவனவற்றைத் தேர்ந்தெடுக்கவும்)',
        options: [
          { value: 'none', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: 'medication', label: 'Fertility Medication', labelTamil: 'கருவுறுதல் மருந்து' },
          { value: 'iui', label: 'IUI (Intrauterine Insemination)', labelTamil: 'IUI' },
          { value: 'ivf', label: 'IVF (In Vitro Fertilization)', labelTamil: 'IVF' },
          { value: 'icsi', label: 'ICSI', labelTamil: 'ICSI' },
          { value: 'surgery', label: 'Surgical Procedures', labelTamil: 'அறுவை சிகிச்சை' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'existing_conditions',
        type: 'multiselect',
        question: 'Do you have any of these medical conditions? (Select all that apply)',
        questionTamil: 'இந்த மருத்துவ நிலைகளில் ஏதேனும் உள்ளதா? (பொருந்துவனவற்றைத் தேர்ந்தெடுக்கவும்)',
        options: [
          { value: 'none', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: 'diabetes', label: 'Diabetes', labelTamil: 'நீரிழிவு' },
          { value: 'hypertension', label: 'Hypertension', labelTamil: 'உயர் இரத்த அழுத்தம்' },
          { value: 'thyroid', label: 'Thyroid Disorder', labelTamil: 'தைராய்டு கோளாறு' },
          { value: 'pcos', label: 'PCOS', labelTamil: 'PCOS' },
          { value: 'endometriosis', label: 'Endometriosis', labelTamil: 'எண்டோமெட்ரியோசிஸ்' },
          { value: 'heart_disease', label: 'Heart Disease', labelTamil: 'இதய நோய்' },
          { value: 'kidney_disease', label: 'Kidney Disease', labelTamil: 'சிறுநீரக நோய்' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'current_medications',
        type: 'text',
        question: 'List any medications you are currently taking',
        questionTamil: 'நீங்கள் தற்போது எடுத்துக்கொள்ளும் மருந்துகளைப் பட்டியலிடுங்கள்',
        placeholder: 'Enter medications or "None"',
        required: false
      },
      {
        id: 'family_history',
        type: 'multiselect',
        question: 'Does your family have a history of any of these conditions?',
        questionTamil: 'உங்கள் குடும்பத்தில் இந்த நிலைகளின் வரலாறு உள்ளதா?',
        options: [
          { value: 'none', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: 'diabetes', label: 'Diabetes', labelTamil: 'நீரிழிவு' },
          { value: 'hypertension', label: 'Hypertension', labelTamil: 'உயர் இரத்த அழுத்தம்' },
          { value: 'obesity', label: 'Obesity', labelTamil: 'உடல் பருமன்' },
          { value: 'infertility', label: 'Infertility', labelTamil: 'மலட்டுத்தன்மை' },
          { value: 'heart_disease', label: 'Heart Disease', labelTamil: 'இதய நோய்' },
          { value: 'cancer', label: 'Cancer', labelTamil: 'புற்றுநோய்' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'anthropometric',
    title: 'Body Measurements',
    titleTamil: 'உடல் அளவீடுகள்',
    description: 'Current physical measurements',
    descriptionTamil: 'தற்போதைய உடல் அளவீடுகள்',
    icon: 'body-outline',
    questions: [
      {
        id: 'height',
        type: 'number',
        question: 'What is your height?',
        questionTamil: 'உங்கள் உயரம் என்ன?',
        placeholder: 'Enter height',
        min: 100,
        max: 250,
        unit: 'cm',
        required: true
      },
      {
        id: 'current_weight',
        type: 'number',
        question: 'What is your current weight?',
        questionTamil: 'உங்கள் தற்போதைய எடை என்ன?',
        placeholder: 'Enter weight',
        min: 30,
        max: 200,
        unit: 'kg',
        required: true
      },
      {
        id: 'waist_circumference',
        type: 'number',
        question: 'What is your waist circumference?',
        questionTamil: 'உங்கள் இடுப்பு சுற்றளவு என்ன?',
        placeholder: 'Measure around your waist at navel level',
        min: 50,
        max: 200,
        unit: 'cm',
        required: true
      },
      {
        id: 'hip_circumference',
        type: 'number',
        question: 'What is your hip circumference?',
        questionTamil: 'உங்கள் இடுப்பு சுற்றளவு என்ன?',
        placeholder: 'Measure around the widest part of your hips',
        min: 50,
        max: 200,
        unit: 'cm',
        required: true
      },
      {
        id: 'previous_weight_1year',
        type: 'number',
        question: 'What was your approximate weight 1 year ago?',
        questionTamil: '1 வருடத்திற்கு முன் உங்கள் தோராயமான எடை என்ன?',
        placeholder: 'Enter approximate weight',
        min: 30,
        max: 200,
        unit: 'kg',
        required: false
      },
      {
        id: 'weight_goal',
        type: 'select',
        question: 'What is your weight management goal?',
        questionTamil: 'உங்கள் எடை மேலாண்மை இலக்கு என்ன?',
        options: [
          { value: 'lose_significant', label: 'Lose significant weight (>10 kg)', labelTamil: 'குறிப்பிடத்தக்க எடையை குறைக்க (>10 கிலோ)' },
          { value: 'lose_moderate', label: 'Lose moderate weight (5-10 kg)', labelTamil: 'மிதமான எடையை குறைக்க (5-10 கிலோ)' },
          { value: 'lose_little', label: 'Lose a little weight (<5 kg)', labelTamil: 'கொஞ்சம் எடையை குறைக்க (<5 கிலோ)' },
          { value: 'maintain', label: 'Maintain current weight', labelTamil: 'தற்போதைய எடையை பராமரிக்க' },
          { value: 'gain', label: 'Gain weight', labelTamil: 'எடை அதிகரிக்க' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle Assessment',
    titleTamil: 'வாழ்க்கை முறை மதிப்பீடு',
    description: 'Understanding your daily habits',
    descriptionTamil: 'உங்கள் தினசரி பழக்கங்களைப் புரிந்துகொள்ளுதல்',
    icon: 'fitness-outline',
    questions: [
      {
        id: 'physical_activity_level',
        type: 'radio',
        question: 'How would you describe your current physical activity level?',
        questionTamil: 'உங்கள் தற்போதைய உடல் செயல்பாட்டு நிலையை எவ்வாறு விவரிப்பீர்கள்?',
        options: [
          { value: 'sedentary', label: 'Sedentary (Little to no exercise)', labelTamil: 'உட்கார்ந்த வாழ்க்கை (உடற்பயிற்சி இல்லை அல்லது குறைவு)' },
          { value: 'light', label: 'Lightly active (1-2 days/week)', labelTamil: 'லேசாக செயல்படுபவர் (வாரம் 1-2 நாட்கள்)' },
          { value: 'moderate', label: 'Moderately active (3-4 days/week)', labelTamil: 'மிதமாக செயல்படுபவர் (வாரம் 3-4 நாட்கள்)' },
          { value: 'active', label: 'Active (5-6 days/week)', labelTamil: 'செயலில் உள்ளவர் (வாரம் 5-6 நாட்கள்)' },
          { value: 'very_active', label: 'Very active (Daily exercise)', labelTamil: 'மிகவும் செயலில் உள்ளவர் (தினசரி உடற்பயிற்சி)' }
        ],
        required: true
      },
      {
        id: 'exercise_types',
        type: 'multiselect',
        question: 'What types of exercise do you currently do? (Select all that apply)',
        questionTamil: 'நீங்கள் தற்போது என்ன வகையான உடற்பயிற்சிகளை செய்கிறீர்கள்?',
        options: [
          { value: 'none', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: 'walking', label: 'Walking', labelTamil: 'நடைப்பயிற்சி' },
          { value: 'jogging', label: 'Jogging/Running', labelTamil: 'ஜாகிங்/ஓட்டம்' },
          { value: 'yoga', label: 'Yoga', labelTamil: 'யோகா' },
          { value: 'swimming', label: 'Swimming', labelTamil: 'நீச்சல்' },
          { value: 'cycling', label: 'Cycling', labelTamil: 'சைக்கிள் ஓட்டுதல்' },
          { value: 'gym', label: 'Gym/Weight Training', labelTamil: 'ஜிம்/எடை பயிற்சி' },
          { value: 'sports', label: 'Sports', labelTamil: 'விளையாட்டு' },
          { value: 'dance', label: 'Dance', labelTamil: 'நடனம்' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'diet_type',
        type: 'radio',
        question: 'What type of diet do you follow?',
        questionTamil: 'நீங்கள் எந்த வகையான உணவை பின்பற்றுகிறீர்கள்?',
        options: [
          { value: 'vegetarian', label: 'Vegetarian', labelTamil: 'சைவம்' },
          { value: 'non_vegetarian', label: 'Non-Vegetarian', labelTamil: 'அசைவம்' },
          { value: 'eggetarian', label: 'Eggetarian', labelTamil: 'முட்டை சைவம்' },
          { value: 'vegan', label: 'Vegan', labelTamil: 'வீகன்' }
        ],
        required: true
      },
      {
        id: 'meals_per_day',
        type: 'select',
        question: 'How many meals do you typically eat per day?',
        questionTamil: 'நீங்கள் வழக்கமாக ஒரு நாளைக்கு எத்தனை உணவு சாப்பிடுகிறீர்கள்?',
        options: [
          { value: '1', label: '1 meal', labelTamil: '1 உணவு' },
          { value: '2', label: '2 meals', labelTamil: '2 உணவு' },
          { value: '3', label: '3 meals', labelTamil: '3 உணவு' },
          { value: '4', label: '4 meals', labelTamil: '4 உணவு' },
          { value: '5_or_more', label: '5 or more meals', labelTamil: '5 அல்லது அதற்கு மேற்பட்ட உணவு' }
        ],
        required: true
      },
      {
        id: 'water_intake',
        type: 'select',
        question: 'How many glasses of water do you drink daily?',
        questionTamil: 'நீங்கள் தினமும் எத்தனை டம்ளர் தண்ணீர் குடிக்கிறீர்கள்?',
        options: [
          { value: 'less_than_4', label: 'Less than 4 glasses', labelTamil: '4 டம்ளருக்கு குறைவாக' },
          { value: '4_6', label: '4-6 glasses', labelTamil: '4-6 டம்ளர்' },
          { value: '6_8', label: '6-8 glasses', labelTamil: '6-8 டம்ளர்' },
          { value: 'more_than_8', label: 'More than 8 glasses', labelTamil: '8 டம்ளருக்கு மேல்' }
        ],
        required: true
      },
      {
        id: 'sleep_hours',
        type: 'select',
        question: 'How many hours of sleep do you get on average?',
        questionTamil: 'சராசரியாக எத்தனை மணி நேரம் தூங்குகிறீர்கள்?',
        options: [
          { value: 'less_than_5', label: 'Less than 5 hours', labelTamil: '5 மணி நேரத்திற்கு குறைவாக' },
          { value: '5_6', label: '5-6 hours', labelTamil: '5-6 மணி நேரம்' },
          { value: '6_7', label: '6-7 hours', labelTamil: '6-7 மணி நேரம்' },
          { value: '7_8', label: '7-8 hours', labelTamil: '7-8 மணி நேரம்' },
          { value: 'more_than_8', label: 'More than 8 hours', labelTamil: '8 மணி நேரத்திற்கு மேல்' }
        ],
        required: true
      },
      {
        id: 'sleep_quality',
        type: 'scale',
        question: 'How would you rate your sleep quality?',
        questionTamil: 'உங்கள் தூக்கத்தின் தரத்தை எவ்வாறு மதிப்பிடுவீர்கள்?',
        min: 1,
        max: 10,
        required: true
      },
      {
        id: 'stress_level',
        type: 'scale',
        question: 'How would you rate your current stress level?',
        questionTamil: 'உங்கள் தற்போதைய மன அழுத்த நிலையை எவ்வாறு மதிப்பிடுவீர்கள்?',
        min: 1,
        max: 10,
        required: true
      },
      {
        id: 'smoking',
        type: 'radio',
        question: 'Do you smoke?',
        questionTamil: 'நீங்கள் புகைபிடிக்கிறீர்களா?',
        options: [
          { value: 'never', label: 'Never', labelTamil: 'ஒருபோதும் இல்லை' },
          { value: 'former', label: 'Former smoker', labelTamil: 'முன்பு புகைத்தவர்' },
          { value: 'occasional', label: 'Occasional', labelTamil: 'எப்போதாவது' },
          { value: 'regular', label: 'Regular smoker', labelTamil: 'வழக்கமாக புகைப்பவர்' }
        ],
        required: true
      },
      {
        id: 'alcohol',
        type: 'radio',
        question: 'Do you consume alcohol?',
        questionTamil: 'நீங்கள் மது அருந்துகிறீர்களா?',
        options: [
          { value: 'never', label: 'Never', labelTamil: 'ஒருபோதும் இல்லை' },
          { value: 'occasional', label: 'Occasionally', labelTamil: 'எப்போதாவது' },
          { value: 'moderate', label: 'Moderately', labelTamil: 'மிதமாக' },
          { value: 'regular', label: 'Regularly', labelTamil: 'வழக்கமாக' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'fertility_female',
    title: 'Female Fertility Information',
    titleTamil: 'பெண் கருவுறுதல் தகவல்',
    description: 'Information specific to female fertility',
    descriptionTamil: 'பெண் கருவுறுதலுக்கான குறிப்பிட்ட தகவல்',
    icon: 'female-outline',
    questions: [
      {
        id: 'menstrual_regularity',
        type: 'radio',
        question: 'How regular is your menstrual cycle?',
        questionTamil: 'உங்கள் மாதவிடாய் சுழற்சி எவ்வளவு வழக்கமானது?',
        genderSpecific: 'female',
        options: [
          { value: 'regular', label: 'Regular (21-35 days)', labelTamil: 'வழக்கமானது (21-35 நாட்கள்)' },
          { value: 'irregular', label: 'Irregular', labelTamil: 'ஒழுங்கற்றது' },
          { value: 'absent', label: 'Absent/Amenorrhea', labelTamil: 'இல்லை/அமெனோரியா' }
        ],
        required: true
      },
      {
        id: 'cycle_length',
        type: 'number',
        question: 'What is your average cycle length (in days)?',
        questionTamil: 'உங்கள் சராசரி சுழற்சி நீளம் என்ன (நாட்களில்)?',
        genderSpecific: 'female',
        placeholder: 'Enter number of days',
        min: 15,
        max: 60,
        unit: 'days',
        required: true
      },
      {
        id: 'pcos_diagnosis',
        type: 'radio',
        question: 'Have you been diagnosed with PCOS (Polycystic Ovary Syndrome)?',
        questionTamil: 'PCOS (பாலிசிஸ்டிக் ஓவரி சிண்ட்ரோம்) கண்டறியப்பட்டதா?',
        genderSpecific: 'female',
        options: [
          { value: 'yes', label: 'Yes', labelTamil: 'ஆம்' },
          { value: 'no', label: 'No', labelTamil: 'இல்லை' },
          { value: 'suspected', label: 'Suspected but not confirmed', labelTamil: 'சந்தேகிக்கப்படுகிறது ஆனால் உறுதிப்படுத்தப்படவில்லை' }
        ],
        required: true
      },
      {
        id: 'previous_pregnancies',
        type: 'select',
        question: 'How many previous pregnancies have you had?',
        questionTamil: 'உங்களுக்கு முன்பு எத்தனை கர்ப்பங்கள் இருந்தன?',
        genderSpecific: 'female',
        options: [
          { value: '0', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: '1', label: '1', labelTamil: '1' },
          { value: '2', label: '2', labelTamil: '2' },
          { value: '3', label: '3', labelTamil: '3' },
          { value: '4_or_more', label: '4 or more', labelTamil: '4 அல்லது அதற்கு மேல்' }
        ],
        required: true
      },
      {
        id: 'miscarriages',
        type: 'select',
        question: 'How many miscarriages have you experienced?',
        questionTamil: 'எத்தனை கருச்சிதைவுகளை அனுபவித்தீர்கள்?',
        genderSpecific: 'female',
        options: [
          { value: '0', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: '1', label: '1', labelTamil: '1' },
          { value: '2', label: '2', labelTamil: '2' },
          { value: '3_or_more', label: '3 or more', labelTamil: '3 அல்லது அதற்கு மேல்' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'fertility_male',
    title: 'Male Fertility Information',
    titleTamil: 'ஆண் கருவுறுதல் தகவல்',
    description: 'Information specific to male fertility',
    descriptionTamil: 'ஆண் கருவுறுதலுக்கான குறிப்பிட்ட தகவல்',
    icon: 'male-outline',
    questions: [
      {
        id: 'semen_analysis',
        type: 'radio',
        question: 'Have you had a semen analysis done?',
        questionTamil: 'விந்தணு பகுப்பாய்வு செய்யப்பட்டதா?',
        genderSpecific: 'male',
        options: [
          { value: 'yes_normal', label: 'Yes, results were normal', labelTamil: 'ஆம், முடிவுகள் சாதாரணமாக இருந்தன' },
          { value: 'yes_abnormal', label: 'Yes, results were abnormal', labelTamil: 'ஆம், முடிவுகள் அசாதாரணமாக இருந்தன' },
          { value: 'no', label: 'No', labelTamil: 'இல்லை' }
        ],
        required: true
      },
      {
        id: 'sperm_issues',
        type: 'multiselect',
        question: 'Have you been diagnosed with any sperm-related issues?',
        questionTamil: 'விந்தணு தொடர்பான பிரச்சினைகள் கண்டறியப்பட்டதா?',
        genderSpecific: 'male',
        options: [
          { value: 'none', label: 'None', labelTamil: 'எதுவும் இல்லை' },
          { value: 'low_count', label: 'Low sperm count', labelTamil: 'குறைந்த விந்தணு எண்ணிக்கை' },
          { value: 'low_motility', label: 'Low motility', labelTamil: 'குறைந்த இயக்கம்' },
          { value: 'abnormal_morphology', label: 'Abnormal morphology', labelTamil: 'அசாதாரண வடிவம்' },
          { value: 'varicocele', label: 'Varicocele', labelTamil: 'வெரிகோசீல்' },
          { value: 'other', label: 'Other', labelTamil: 'மற்றவை' }
        ],
        required: true
      },
      {
        id: 'erectile_issues',
        type: 'radio',
        question: 'Do you experience any erectile dysfunction?',
        questionTamil: 'விறைப்புத்தன்மை பிரச்சினைகள் உள்ளதா?',
        genderSpecific: 'male',
        options: [
          { value: 'no', label: 'No', labelTamil: 'இல்லை' },
          { value: 'occasional', label: 'Occasionally', labelTamil: 'எப்போதாவது' },
          { value: 'frequent', label: 'Frequently', labelTamil: 'அடிக்கடி' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'couple_info',
    title: 'Couple Information',
    titleTamil: 'தம்பதிகள் தகவல்',
    description: 'Information about you as a couple',
    descriptionTamil: 'தம்பதிகளாக உங்களைப் பற்றிய தகவல்',
    icon: 'people-outline',
    questions: [
      {
        id: 'marriage_duration',
        type: 'select',
        question: 'How long have you been married?',
        questionTamil: 'எவ்வளவு காலமாக திருமணமாகி இருக்கிறீர்கள்?',
        options: [
          { value: 'less_than_1', label: 'Less than 1 year', labelTamil: '1 வருடத்திற்கு குறைவாக' },
          { value: '1_3', label: '1-3 years', labelTamil: '1-3 வருடங்கள்' },
          { value: '3_5', label: '3-5 years', labelTamil: '3-5 வருடங்கள்' },
          { value: '5_10', label: '5-10 years', labelTamil: '5-10 வருடங்கள்' },
          { value: 'more_than_10', label: 'More than 10 years', labelTamil: '10 வருடங்களுக்கு மேல்' }
        ],
        required: true
      },
      {
        id: 'intercourse_frequency',
        type: 'select',
        question: 'How often do you have intercourse?',
        questionTamil: 'எவ்வளவு அடிக்கடி உடலுறவு கொள்கிறீர்கள்?',
        options: [
          { value: 'daily', label: 'Daily', labelTamil: 'தினமும்' },
          { value: '3_4_per_week', label: '3-4 times per week', labelTamil: 'வாரத்திற்கு 3-4 முறை' },
          { value: '1_2_per_week', label: '1-2 times per week', labelTamil: 'வாரத்திற்கு 1-2 முறை' },
          { value: 'few_per_month', label: 'A few times per month', labelTamil: 'மாதத்திற்கு சில முறை' },
          { value: 'rarely', label: 'Rarely', labelTamil: 'அரிதாக' }
        ],
        required: true
      },
      {
        id: 'partner_support',
        type: 'scale',
        question: 'How supportive is your partner in this journey?',
        questionTamil: 'இந்த பயணத்தில் உங்கள் துணை எவ்வளவு ஆதரவாக இருக்கிறார்?',
        min: 1,
        max: 10,
        required: true
      },
      {
        id: 'emotional_state',
        type: 'radio',
        question: 'How would you describe your current emotional state regarding fertility?',
        questionTamil: 'கருவுறுதல் தொடர்பான உங்கள் தற்போதைய உணர்ச்சி நிலையை எவ்வாறு விவரிப்பீர்கள்?',
        options: [
          { value: 'hopeful', label: 'Hopeful and positive', labelTamil: 'நம்பிக்கையுடன் நேர்மறையாக' },
          { value: 'anxious', label: 'Anxious but hopeful', labelTamil: 'கவலையுடன் ஆனால் நம்பிக்கையுடன்' },
          { value: 'stressed', label: 'Stressed', labelTamil: 'மன அழுத்தத்துடன்' },
          { value: 'discouraged', label: 'Discouraged', labelTamil: 'நிராசையுடன்' },
          { value: 'neutral', label: 'Neutral', labelTamil: 'நடுநிலையாக' }
        ],
        required: true
      }
    ]
  },
  {
    id: 'expectations',
    title: 'Study Expectations',
    titleTamil: 'ஆய்வு எதிர்பார்ப்புகள்',
    description: 'Your goals and expectations from this study',
    descriptionTamil: 'இந்த ஆய்விலிருந்து உங்கள் இலக்குகள் மற்றும் எதிர்பார்ப்புகள்',
    icon: 'star-outline',
    questions: [
      {
        id: 'motivation',
        type: 'multiselect',
        question: 'What motivated you to join this study? (Select all that apply)',
        questionTamil: 'இந்த ஆய்வில் சேர உங்களை என்ன ஊக்கப்படுத்தியது?',
        options: [
          { value: 'weight_loss', label: 'Desire to lose weight', labelTamil: 'எடை குறைக்க விரும்புகிறேன்' },
          { value: 'fertility', label: 'Improve fertility chances', labelTamil: 'கருவுறுதல் வாய்ப்புகளை மேம்படுத்த' },
          { value: 'health', label: 'Overall health improvement', labelTamil: 'ஒட்டுமொத்த ஆரோக்கியத்தை மேம்படுத்த' },
          { value: 'guidance', label: 'Professional guidance', labelTamil: 'தொழில்முறை வழிகாட்டுதல்' },
          { value: 'research', label: 'Contribute to research', labelTamil: 'ஆராய்ச்சிக்கு பங்களிக்க' },
          { value: 'support', label: 'Emotional support', labelTamil: 'உணர்ச்சி ஆதரவு' }
        ],
        required: true
      },
      {
        id: 'commitment_level',
        type: 'scale',
        question: 'How committed are you to following the study guidelines?',
        questionTamil: 'ஆய்வு வழிகாட்டுதல்களைப் பின்பற்றுவதில் நீங்கள் எவ்வளவு உறுதியாக இருக்கிறீர்கள்?',
        min: 1,
        max: 10,
        required: true
      },
      {
        id: 'challenges_expected',
        type: 'multiselect',
        question: 'What challenges do you anticipate? (Select all that apply)',
        questionTamil: 'என்ன சவால்களை எதிர்பார்க்கிறீர்கள்?',
        options: [
          { value: 'time', label: 'Finding time for exercise', labelTamil: 'உடற்பயிற்சிக்கு நேரம் கண்டுபிடிப்பது' },
          { value: 'diet', label: 'Changing eating habits', labelTamil: 'உணவு பழக்கங்களை மாற்றுவது' },
          { value: 'motivation', label: 'Staying motivated', labelTamil: 'ஊக்கத்துடன் இருப்பது' },
          { value: 'tracking', label: 'Regular tracking/logging', labelTamil: 'வழக்கமான கண்காணிப்பு/பதிவு' },
          { value: 'family', label: 'Family responsibilities', labelTamil: 'குடும்ப பொறுப்புகள்' },
          { value: 'work', label: 'Work commitments', labelTamil: 'வேலை கடமைகள்' }
        ],
        required: true
      },
      {
        id: 'additional_comments',
        type: 'text',
        question: 'Any additional comments or concerns you would like to share?',
        questionTamil: 'பகிர்ந்து கொள்ள விரும்பும் கூடுதல் கருத்துகள் அல்லது கவலைகள் ஏதேனும் உள்ளதா?',
        placeholder: 'Optional - share any additional thoughts',
        required: false
      }
    ]
  }
];

export const getTotalQuestions = (gender?: 'male' | 'female'): number => {
  let total = 0;
  questionnaireData.forEach(section => {
    section.questions.forEach(q => {
      if (!q.genderSpecific || q.genderSpecific === gender) {
        total++;
      }
    });
  });
  return total;
};

export const getSectionsByGender = (gender?: 'male' | 'female'): QuestionSection[] => {
  return questionnaireData.filter(section => {
    if (section.id === 'fertility_female' && gender === 'male') return false;
    if (section.id === 'fertility_male' && gender === 'female') return false;
    return true;
  });
};
