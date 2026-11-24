import { describe, expect, it } from 'vitest';
import { detectLanguage, ruleExtractJob, ruleExtractProfile, wordsToNumbers } from './extract-rules';

describe('wordsToNumbers', () => {
  it('handles Hindi, Marathi and Devanagari digits', () => {
    expect(wordsToNumbers('aath sau rupaye')).toBe('800 rupaye');
    expect(wordsToNumbers('आठ सौ रुपये')).toBe('800 रुपये');
    expect(wordsToNumbers('रोज पाचशे रुपये')).toBe('रोज 500 रुपये');
    expect(wordsToNumbers('९०० रुपये')).toBe('900 रुपये');
    expect(wordsToNumbers('डेढ़ हजार')).toBe('1500');
    expect(wordsToNumbers('1,200 per day')).toBe('1200 per day');
  });
});

describe('ruleExtractProfile', () => {
  it('romanised Hindi (the demo sentence)', () => {
    const p = ruleExtractProfile('Mera naam Ramesh hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye.');
    expect(p).toMatchObject({ name: 'Ramesh', skills: ['plumber'], locality: 'Kothrud', expectedWage: 800, language: 'hi' });
  });

  it('Devanagari Hindi with number words', () => {
    const p = ruleExtractProfile('मेरा नाम सुनील यादव है। मैं पेंटर हूँ, दस साल का अनुभव है, हडपसर में रहता हूँ, आठ सौ रुपये रोज़ चाहिए।');
    expect(p).toMatchObject({ name: 'सुनील यादव', skills: ['painter'], locality: 'Hadapsar', expectedWage: 800, experienceYears: 10, language: 'hi' });
  });

  it('Marathi', () => {
    const p = ruleExtractProfile('माझं नाव गणेश आहे. मी गवंडी काम करतो, वाकड मध्ये राहतो. रोज नऊशे रुपये पाहिजेत.');
    expect(p).toMatchObject({ name: 'गणेश', skills: ['mason'], locality: 'Wakad', expectedWage: 900, language: 'mr' });
  });

  it('English', () => {
    const p = ruleExtractProfile("Hi, my name is Joseph. I'm an electrician in Viman Nagar with 6 years experience, I charge 1000 per day.");
    expect(p).toMatchObject({ name: 'Joseph', skills: ['electrician'], locality: 'Viman Nagar', expectedWage: 1000, experienceYears: 6, language: 'en' });
  });

  it('returns nulls rather than guessing', () => {
    const p = ruleExtractProfile('hello');
    expect(p).toMatchObject({ name: null, skills: [], locality: null, expectedWage: null });
  });
});

describe('ruleExtractJob', () => {
  const today = '2026-11-24';
  it('the demo employer sentence', () => {
    const j = ruleExtractJob('Need 2 painters near Baner for 3 days, ₹900 per day, start tomorrow.', null, today);
    expect(j).toMatchObject({ skill: 'painter', workersNeeded: 2, durationDays: 3, wagePerDay: 900, locality: 'Baner', startDate: '2026-11-25' });
  });
  it('Hindi employer', () => {
    const j = ruleExtractJob('Kharadi mein do plumber chahiye, kal se, teen din ka kaam, 850 rupaye roz', null, today);
    expect(j).toMatchObject({ skill: 'plumber', workersNeeded: 2, durationDays: 3, wagePerDay: 850, locality: 'Kharadi', startDate: '2026-11-25', language: 'hi' });
  });
});

describe('detectLanguage', () => {
  it('distinguishes hi / mr / en', () => {
    expect(detectLanguage('मेरा नाम राम है')).toBe('hi');
    expect(detectLanguage('माझं नाव राम आहे')).toBe('mr');
    expect(detectLanguage('I need a plumber')).toBe('en');
  });
});
